#!/bin/bash
set -e

echo "=== Multipass VM Setup für Frontend/Backend/Reverse Proxy ==="
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Prüfen ob multipass installiert ist
if ! command -v multipass &> /dev/null; then
    echo -e "${RED}Fehler: multipass ist nicht installiert${NC}"
    exit 1
fi

# Wechsle ins Script-Verzeichnis
cd "$(dirname "$0")"

# Funktion zum Warten auf cloud-init
wait_for_cloud_init() {
    local vm_name=$1
    echo -e "${YELLOW}Warte auf cloud-init für $vm_name...${NC}"
    while true; do
        status=$(multipass exec "$vm_name" -- cloud-init status 2>/dev/null || echo "running")
        if [[ "$status" == *"done"* ]]; then
            echo -e "${GREEN}cloud-init für $vm_name abgeschlossen${NC}"
            break
        elif [[ "$status" == *"error"* ]]; then
            echo -e "${RED}cloud-init Fehler bei $vm_name${NC}"
            multipass exec "$vm_name" -- cat /var/log/cloud-init-output.log | tail -50
            exit 1
        fi
        sleep 5
    done
}

# Funktion zum Abrufen der IP-Adresse
get_ip() {
    local vm_name=$1
    multipass info "$vm_name" --format csv | tail -1 | cut -d',' -f3
}

echo "=== Schritt 1: VMs erstellen ==="
echo ""

# Backend VM starten
echo -e "${YELLOW}Erstelle Backend VM...${NC}"
multipass launch 24.04 --name ci-backend --cpus 1 --memory 1G --cloud-init backend.cloud-init.yaml

# Frontend VM starten
echo -e "${YELLOW}Erstelle Frontend VM...${NC}"
multipass launch 24.04 --name ci-frontend --cpus 2 --memory 2G --cloud-init frontend.cloud-init.yaml

# Reverse Proxy VM starten
echo -e "${YELLOW}Erstelle Reverse Proxy VM...${NC}"
multipass launch 24.04 --name ci-reverseproxy --cpus 1 --memory 512M --cloud-init reverseproxy.cloud-init.yaml

echo ""
echo "=== Schritt 2: Warte auf cloud-init Abschluss ==="
echo ""

# Warten auf cloud-init für alle VMs
wait_for_cloud_init "ci-backend"
wait_for_cloud_init "ci-frontend"
wait_for_cloud_init "ci-reverseproxy"

echo ""
echo "=== Schritt 3: IP-Adressen abrufen ==="
echo ""

# IP-Adressen abrufen
BACKEND_IP=$(get_ip "ci-backend")
FRONTEND_IP=$(get_ip "ci-frontend")
REVERSEPROXY_IP=$(get_ip "ci-reverseproxy")

echo -e "Backend IP:       ${GREEN}$BACKEND_IP${NC}"
echo -e "Frontend IP:      ${GREEN}$FRONTEND_IP${NC}"
echo -e "Reverse Proxy IP: ${GREEN}$REVERSEPROXY_IP${NC}"

echo ""
echo "=== Schritt 4: Nginx Konfiguration auf Reverse Proxy aktualisieren ==="
echo ""

# Nginx Konfiguration mit echten IPs aktualisieren
multipass exec ci-reverseproxy -- sudo sed -i "s/FRONTEND_IP/$FRONTEND_IP/g" /etc/nginx/sites-available/reverseproxy
multipass exec ci-reverseproxy -- sudo sed -i "s/BACKEND_IP/$BACKEND_IP/g" /etc/nginx/sites-available/reverseproxy

# Nginx neu starten
multipass exec ci-reverseproxy -- sudo nginx -t
multipass exec ci-reverseproxy -- sudo systemctl restart nginx

echo -e "${GREEN}Nginx Konfiguration aktualisiert und neu gestartet${NC}"

echo ""
echo "=== Schritt 5: VM Status ==="
echo ""

multipass list | grep -E "^(Name|ci-)"

echo ""
echo "=== Schritt 6: SSL-Zertifikat exportieren ==="
echo ""

# Zertifikat lokal speichern
mkdir -p ./certs
multipass exec ci-reverseproxy -- sudo cat /etc/nginx/ssl/reverseproxy.crt > ./certs/reverseproxy.crt
echo -e "${GREEN}Zertifikat gespeichert unter: ./certs/reverseproxy.crt${NC}"

echo ""
echo "=== Setup abgeschlossen! ==="
echo ""
echo "1. Füge folgende Zeile zu /etc/hosts hinzu:"
echo -e "   ${YELLOW}$REVERSEPROXY_IP    reverseproxy.cloudhelden.local${NC}"
echo ""
echo "2. Importiere das Zertifikat in deinen Keychain (macOS):"
echo -e "   ${YELLOW}sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./certs/reverseproxy.crt${NC}"
echo ""
echo "3. Öffne im Browser:"
echo -e "   ${GREEN}https://reverseproxy.cloudhelden.local${NC}"
echo ""
echo "Oder teste direkt mit curl:"
echo -e "  curl http://$FRONTEND_IP                    # Frontend direkt"
echo -e "  curl http://$BACKEND_IP:3000/api/health     # Backend direkt"
echo -e "  curl -k https://reverseproxy.cloudhelden.local/api/health  # Über Reverse Proxy (ohne Zertifikatsvalidierung)"
echo ""
