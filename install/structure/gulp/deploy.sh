#!/usr/bin/env bash
# Extract archive name without extension
file=${1##*/}
releaseFolder=${file%%.*}
# Assign host
host=$2
# Assign root folder where nginx virtual host is pointing (not the public_html folder but its parent)
rootFolder=$3
# Folder containing all releases
path='~/www/releases'

#Extract domain
IFS='@' read -ra parts <<< "$host"
domain="${parts[1]}"

# Define colors
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

printf  "Copying release archive to ${PURPLE}${host}:${path}${NC}...\n"
scp $1 $host:$path
ssh -T $host <<-ENDSSH
    cd $path
    printf "Unzipping to ${PURPLE}${path}/${releaseFolder}${NC}...\n"
    unzip -qu $releaseFolder.zip -d $releaseFolder
    rm $releaseFolder.zip

    # Store active release name for possible reverting in the future
    activeRelease=\$(cat active-$rootFolder.txt)
    echo \$activeRelease > $releaseFolder/revert-release.txt

    printf "Activating release ${PURPLE}$releaseFolder${NC}...\n"
    cd ..
    unlink $rootFolder
    ln -s releases/$releaseFolder $rootFolder
    ln -s ~/www/files/$rootFolder/Uploads $rootFolder/public_html/uploads
    ln -s ~/www/files/$rootFolder/Temp $rootFolder/Temp
    echo $releaseFolder > releases/active-$rootFolder.txt
    sudo /usr/sbin/service php7.0-fpm restart
    php $rootFolder/vendor/webiny/setup/release.php $domain
    printf "\n${GREEN}INFO${NC}: We are done! Refresh your browser :)\n"
ENDSSH