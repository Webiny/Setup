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

echo "Copying release archive to ${host}:${path}..."
scp $1 $host:$path
ssh -T $host <<-ENDSSH
    cd $path
    echo "Unzipping to ${path}/${releaseFolder}..."
    unzip -qu $releaseFolder.zip -d $releaseFolder
    rm $releaseFolder.zip
    cd ..
    echo "Activating new release..."
    unlink $rootFolder
    ln -s releases/$releaseFolder $rootFolder
    sudo /usr/sbin/service php7.0-fpm restart
    echo "Done!"
ENDSSH