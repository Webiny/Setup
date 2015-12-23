<?php

require_once getcwd() . '/vendor/autoload.php';

class Installer
{
    use \Webiny\Component\StdLib\StdLibTrait;

    private $domain;
    private $databaseName = 'Webiny';
    private $absPath;
    private $errorLog;

    function construct()
    {
        $this->absPath = getcwd();
    }

    public function install()
    {
        $this->collectData();
        $this->createFolders();
        $this->installCoreApp();
        $this->createConfigs();
        $this->createHost();
    }

    private function collectData()
    {
        do {
            $this->domain = \cli\prompt('What is your development domain?', null, ':');
        } while (!$this->domain);

        $this->errorLog = '/var/log/nginx/' . $this->domain . '-error.log';
        $this->databaseName = \cli\prompt('What is your database name?', 'Webiny', ':');
    }

    private function createFolders()
    {
        \cli\line('Creating necessary folder structure in %g' . $this->absPath . '%n');
        exec('cp -R ./install/structure/* ' . $this->absPath);
        mkdir($this->absPath . '/Apps');
        mkdir($this->absPath . '/Cache');
        mkdir($this->absPath . '/Temp');
    }

    private function installCoreApp()
    {
        \cli\line('Cloning %gwebiny/core%n app...');
        exec('git clone https://github.com/Webiny/Core.git Apps/Core');
    }

    private function createConfigs()
    {
        $this->injectVars('Configs/Production/Application.yaml');
        $this->injectVars('Configs/Production/Database.yaml');
        $this->injectVars('Configs/ConfigSets.yaml');
    }

    private function createHost()
    {
        $deployHost = \cli\choose('Would you like to create a virtual host for your domain?', 'yn', 'y');
        if ($deployHost) {
            $host = $this->injectVars(__DIR__ . '/install/hosts/host.cfg', false);

            $hostPath = '/etc/nginx/sites-available';
            $hostPath = \cli\prompt('Where do you want to place your host file?', $hostPath, $marker = ':');

            $hostPath .= '/' . $this->domain;
            file_put_contents($hostPath, $host);
            symlink($hostPath, '/etc/nginx/sites-enabled/' . $this->domain);

            \cli\line("\nIMPORTANT: since we added a new host, you need to reload your nginx! Run: %gsudo service nginx reload%n");
            \cli\line("\nReloading nginx to enable your new host...");
            exec('sudo service nginx reload');
        }
    }

    private function injectVars($filePath, $autoSave = true)
    {
        if ($this->str($filePath)->startsWith('/')) {
            $path = $filePath;
        } else {
            $path = $this->absPath . '/' . $filePath;
        }

        $vars = [
            '{ABS_PATH}' => $this->absPath,
            '{DOMAIN}' => $this->domain,
            '{DATABASE_NAME}' => $this->databaseName,
            '{ERROR_LOG}' => $this->errorLog
        ];

        $cfg = file_get_contents($path);
        $cfg = str_replace(array_keys($vars), array_values($vars), $cfg);

        if ($autoSave) {
            file_put_contents($path, $cfg);
        }

        return $cfg;
    }
}