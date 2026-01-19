#!/bin/bash

echo "=== Multipass VMs stoppen und löschen ==="
echo ""

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VMS=("ci-backend" "ci-frontend" "ci-reverseproxy")

for vm in "${VMS[@]}"; do
    if multipass info "$vm" &>/dev/null; then
        echo -e "${YELLOW}Lösche $vm...${NC}"
        multipass delete "$vm" --purge
        echo -e "${GREEN}$vm gelöscht${NC}"
    else
        echo -e "${RED}$vm existiert nicht${NC}"
    fi
done

echo ""
echo -e "${GREEN}Alle VMs wurden entfernt.${NC}"
