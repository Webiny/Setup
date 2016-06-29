#!/usr/bin/env bash
# Assign host
host=$1
# Assign root folder where nginx virtual host is pointing (not the public_html folder but its parent)
rootFolder=$2
# Folder containing all releases
path='~/www'

PURPLE='\033[0;35m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ssh -T $host <<-ENDSSH
    cd $path

    # Get previous release from active release folder
    previous=false
    if [[ -e $rootFolder/revert-release.txt ]]; then
        previous=\$(cat $rootFolder/revert-release.txt)
    fi

    if [[ \$previous != false && \$previous != "" ]]; then
        active=\$(cat releases/active-$rootFolder.txt)
        printf "\nReverting release ${PURPLE}\$active${NC} to ${PURPLE}\$previous...${NC}\n"
        echo \$previous > releases/active-$rootFolder.txt
        unlink $rootFolder
        ln -s releases/\$previous $rootFolder
        sudo /usr/sbin/service php7.0-fpm restart
        printf "\n${GREEN}INFO${NC}: We are done! Refresh your browser :)\n"
    else
        printf "\n${PURPLE}INFO${NC}: There is no earlier release to revert to!\n\n"
    fi
ENDSSH