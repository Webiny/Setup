<?php

use Apps\Core\Php\Entities\User;
use Apps\Core\Php\Entities\UserGroup;
use Webiny\Component\StdLib\Exception\ExceptionAbstract;

$autoloader = require_once getcwd() . '/vendor/autoload.php';

class Installer
{
    use \Webiny\Component\StdLib\StdLibTrait, \Webiny\Component\Config\ConfigTrait;

    private $createConfiguration = false;
    private $createUser = false;
    private $createVirtualHost = false;
    private $useUserConfig = false;

    private $domain;
    private $domainHost;
    private $databaseName = 'Webiny';
    private $absPath;
    private $sitesEnabled = '/etc/nginx/sites-enabled/';
    private $sitesAvailable = '/etc/nginx/sites-available/';
    private $userEmail;
    private $userPassword;
    private $hostPath;

    /**
     * @var bool|\Webiny\Component\StdLib\StdObject\ArrayObject\ArrayObject
     */
    private $config = false;

    private $defaultConfig = [
        'Config'      => false,
        'User'        => false,
        'VirtualHost' => false
    ];

    private $publicUserGroup = [
        'name'        => 'Public',
        'tag'         => 'public',
        'permissions' => [
            'entities' => [
                'Apps\\Core\\Php\\Entities\\User' => [
                    'login' => [
                        'post' => true
                    ]
                ]
            ],
            'services' => [
                'Apps\\Core\\Php\\Services\\Apps' => [
                    'index' => [
                        'get' => true
                    ]
                ]
            ]
        ]
    ];
    private $adminUserGroup = [
        'name'        => 'Administrators',
        'tag'         => 'administrators',
        'permissions' => [
            'entities' => [
                'Apps\\Core\\Php\\Entities\\User' => [
                    'create' => true,
                    'read'   => true,
                    'update' => true,
                    'delete' => true,
                    'me'     => [
                        'get'   => true,
                        'patch' => true
                    ]
                ]
            ]
        ]
    ];
    private $usersUserGroup = [
        'name'        => 'Users',
        'tag'         => 'users',
        'permissions' => [
            'entities' => [
                'Apps\\Core\\Php\\Entities\\User' => [
                    'me' => [
                        'get'   => true,
                        'patch' => true
                    ]
                ]
            ]
        ]
    ];

    public function __construct($autoloader)
    {
        $this->autoloader = $autoloader;
        $this->absPath = getcwd() . '/';
    }

    public function install()
    {
        \cli\line("\nWelcome to Webiny Setup Wizard");
        \cli\line("==============================\n");

        if (file_exists($this->absPath . 'webiny.yaml')) {
            \cli\line('We have detected an installer config file:');
            \cli\line("===========================================\n");
            \cli\line(file_get_contents($this->absPath . 'webiny.yaml'));
            \cli\line("===========================================\n\n");
            $useConfig = \cli\choose('Would you like to use this config', 'yn', 'y');
            if ($useConfig === 'y') {
                $this->useUserConfig = true;
                $installerConfig = $this->config()->yaml($this->absPath . 'webiny.yaml')->toArray();
                $this->config = $this->arr($this->defaultConfig)->mergeSmart($installerConfig);

                if ($this->config->key('Config')) {
                    $this->createConfiguration = true;
                }

                if ($this->config->key('User')) {
                    $this->createUser = true;
                }

                if ($this->config->key('VirtualHost')) {
                    $this->createVirtualHost = true;
                }
            }
        }

        if (!$this->config) {
            $this->config = $this->arr($this->defaultConfig);
            $this->collectData();
        }

        if (!$this->useUserConfig) {
            \cli\line("\n\nInstaller config:");
            \cli\line("===========================================\n");
            \cli\line($this->config()->parseResource($this->config->val())->getAsYaml());
            \cli\line("===========================================\n");
            if (\cli\choose('Do you want to install Webiny using this configuration', 'yn', 'y') === 'n') {
                die();
            }
        }

        $this->createFolders();
        $this->createConfigs();
        $this->createVirtualHost();
        $this->autoloader->addPsr4('Apps\\Core\\', $this->absPath . 'Apps/Core');
        $this->setupEntitiesAndIndexes();
        $this->createUser();
    }

    private function collectData()
    {
        if (\cli\choose('Do you want to create a new configuration', 'yn', 'y') === 'y') {
            $this->createConfiguration = true;
            do {
                $this->domain = \cli\prompt('What is your development domain? (eg. demo.app)', null, ': ');
            } while (!$this->domain);

            if (!$this->str($this->domain)->startsWith('http://') && !$this->str($this->domain)->startsWith('https://')) {
                $this->domain = 'http://' . $this->domain;
            }
            $this->config->keyNested('Config.Domains.Development', $this->domain);

            $this->databaseName = \cli\prompt('What is your database name?', 'Webiny', ': ');
            $this->config->keyNested('Config.Database', $this->databaseName);

            $apps = \cli\prompt('Enter a comma-separated list of apps and their versions (eg. Cms@v1.5)', null, ': ');
            if ($apps) {
                foreach (explode(",", $apps) as $app) {
                    list($n, $v) = explode("@", $app);
                    $this->config->keyNested('Config.Apps.' . trim($n), trim($v));
                }
            }
        }

        if (\cli\choose('Do you want to create a new admin user', 'yn', 'y') === 'y') {
            $this->createUser = true;
            $this->userEmail = \cli\prompt('Admin user email', null, ': ');
            $this->userPassword = \cli\prompt('Admin user password?', null, ': ', true);
            $this->config->keyNested('User.Username', $this->userEmail);
            $this->config->keyNested('User.Password', $this->userPassword);
        }


        if (\cli\choose('Do you want to create a new virtual host', 'yn', 'y') === 'y') {
            $this->createVirtualHost = true;
            $hostPath = $this->sitesAvailable;
            $hostPath = \cli\prompt('Where do you want to place your host file?', $hostPath, $marker = ': ');
            $this->hostPath = $this->str($hostPath)->trimRight('/')->append('/')->val();
            if (!$this->domain) {
                do {
                    $this->domain = \cli\prompt('What is your development domain? (eg: demo.app)', null, ': ');
                } while (!$this->domain);
                if (!$this->str($this->domain)->startsWith('http://') && !$this->str($this->domain)->startsWith('https://')) {
                    $this->domain = 'http://' . $this->domain;
                }
                $this->config->keyNested('Config.Domains.Development', $this->domain);
            }
            $this->domainHost = $this->url($this->domain)->getHost();
            $this->config->keyNested('VirtualHost.ErrorLog', '/var/log/nginx/' . $this->domainHost . '-error.log');
            $hostPath = $this->hostPath . $this->domainHost;

            if (file_exists($hostPath)) {
                $options = [
                    'auto'      => 'Auto-generate a file name',
                    'rename'    => 'Enter a different file name',
                    'finish'    => 'Leave the existing file and finish host setup',
                    'overwrite' => 'Overwrite existing file'
                ];

                \cli\line("\nA file %m{$hostPath}%n already exists!");
                $choice = \cli\menu($options, null, 'What should I do?');
                switch ($choice) {
                    case 'overwrite':
                        break;
                    case 'rename':
                        $fileName = \cli\prompt('Enter a host file name', null, $marker = ': ');
                        $hostPath = $this->hostPath . $fileName;
                        break;
                    case 'finish':
                        break;
                    default:
                        $hostPath .= '-webiny-' . date('mdHis');
                }
            }
            $this->config->keyNested('VirtualHost.Path', $hostPath);
        } else {
            $this->config->key('VirtualHost', false);
        }
    }

    private function createFolders()
    {
        \cli\line("\nCreating necessary folder structure in %m{$this->absPath}%n");
        if (!file_exists($this->absPath . 'public_html/index.php')) {
            exec('cp -R ' . __DIR__ . '/install/structure/public_html ' . $this->absPath);
        }

        if (!file_exists($this->absPath . 'Apps')) {
            mkdir($this->absPath . 'Apps');
        }

        if (!file_exists($this->absPath . 'Cache')) {
            mkdir($this->absPath . 'Cache');
        }

        if (!file_exists($this->absPath . 'Temp')) {
            mkdir($this->absPath . 'Temp');
        }
    }

    private function createConfigs()
    {
        if (!$this->createConfiguration) {
            return;
        }

        exec('cp -R ' . __DIR__ . '/install/structure/Configs ' . $this->absPath);

        // Production Application.yaml
        $configPath = $this->absPath . 'Configs/Production/Application.yaml';
        $config = $this->config()->yaml($configPath);
        $webPath = $this->config->keyNested('Config.Domains.Production', $this->config->keyNested('Config.Domains.Development'), true);
        $config->set('Application.AbsolutePath', $this->absPath);
        $config->set('Application.WebPath', $webPath);
        $config->set('Application.ApiPath', $webPath . '/api');
        $config->set('Apps', $this->config->keyNested('Config.Apps'));
        file_put_contents($configPath, $config->getAsYaml());

        // Development Application.yaml
        $configPath = $this->absPath . 'Configs/Development/Application.yaml';
        $config = $this->config()->yaml($configPath);
        $webPath = $this->config->keyNested('Config.Domains.Development', false, true);
        if ($webPath) {
            $config->set('Application.WebPath', $webPath);
            $config->set('Application.ApiPath', $webPath . '/api');
            file_put_contents($configPath, $config->getAsYaml());
        }

        // Database.yaml
        $configPath = $this->absPath . 'Configs/Production/Database.yaml';
        $config = $this->config()->yaml($configPath);
        $config->set('Mongo.Services.Webiny.Calls.0.1', [$this->config->keyNested('Config.Database')]);
        file_put_contents($configPath, $config->getAsYaml());

        // ConfigSets.yaml
        $configPath = $this->absPath . 'Configs/ConfigSets.yaml';
        $config = $this->config()->yaml($configPath);
        $config->set('ConfigSets.Development', $this->config->keyNested('Config.Domains.Development'));
        file_put_contents($configPath, $config->getAsYaml());
    }

    private function createVirtualHost()
    {
        if (!$this->createVirtualHost) {
            return;
        }

        $host = $this->injectVars(__DIR__ . '/install/hosts/host.cfg', false);
        file_put_contents(__DIR__ . '/host.tmp', $host);

        $hostPath = $this->config->keyNested('VirtualHost.Path');
        $domainHost = basename($hostPath);
        if (!file_exists($hostPath)) {
            mkdir(dirname($hostPath), 0755, true);
        }

        exec('sudo cp ' . __DIR__ . '/host.tmp ' . $hostPath);
        \cli\line("Created host file: %c$hostPath%n");

        $link = $this->sitesEnabled . $domainHost;
        if (file_exists($link)) {
            exec("sudo unlink $link");
        }

        \cli\line("Symlink: %c$link%n -> %c$hostPath%n");

        exec('sudo ln -s ' . $hostPath . ' ' . $link);
        \cli\line("Attempting to reload nginx to enable your new host (%csudo service nginx reload%n)");
        exec('sudo service nginx reload');

        unlink(__DIR__ . '/host.tmp');
        \cli\line("\n%mIMPORTANT%n: If using a VM, make sure you add a rule for %c{$domainHost}%n domain on your host machine!");
    }

    private function createUser()
    {
        if (!$this->createUser) {
            return;
        }

        $_SERVER = [];
        $_SERVER['SERVER_NAME'] = $this->config->keyNested('Config.Domains.Development');

        // TODO: if nema domene pitaj input

        // Bootstrap the system using newly generated config
        \Apps\Core\Php\Bootstrap\Bootstrap::getInstance();

        // Create 'public', 'users' and 'administrators' user groups
        try {
            $publicGroup = new UserGroup();
            $publicGroup->populate($this->publicUserGroup)->save();
        } catch (ExceptionAbstract $e) {
            // Public group exists
        }

        try {
            $publicGroup = new UserGroup();
            $publicGroup->populate($this->usersUserGroup)->save();
        } catch (ExceptionAbstract $e) {
            // Users group exists
        }


        try {
            $adminGroup = new UserGroup();
            $adminGroup->populate($this->adminUserGroup)->save();
        } catch (ExceptionAbstract $e) {
            // Admin group exists
            $adminGroup = UserGroup::findOne(['tag' => 'administrators']);
        }

        // Create admin user
        try {
            $user = new User();
            $user->email = $this->config->keyNested('User.Username');
            $user->password = $this->config->keyNested('User.Password');
            $user->groups = [$adminGroup->id];
            $user->firstName = '';
            $user->lastName = '';
            $user->save();
        } catch (ExceptionAbstract $e) {
            // User exists
            \cli\line("\n%mWARNING%n: An admin user with email %c{$this->config->keyNested('User.Username')}%n already exists!");
        }
    }

    private function setupEntitiesAndIndexes()
    {
        User::wInstall();
        UserGroup::wInstall();
    }

    private function injectVars($filePath, $autoSave = true)
    {
        if ($this->str($filePath)->startsWith('/')) {
            $path = $filePath;
        } else {
            $path = $this->absPath . $filePath;
        }

        $vars = [
            '{ABS_PATH}'      => $this->absPath,
            '{DOMAIN}'        => $this->config->keyNested('Config.Domains.Development'),
            '{DOMAIN_HOST}'   => $this->config->keyNested('VirtualHost.Domain'),
            '{DATABASE_NAME}' => $this->config->keyNested('Config.Database'),
            '{ERROR_LOG}'     => $this->config->keyNested('VirtualHost.ErrorLog'),
        ];

        $cfg = file_get_contents($path);
        $cfg = str_replace(array_keys($vars), array_values($vars), $cfg);

        if ($autoSave) {
            file_put_contents($path, $cfg);
        }

        return $cfg;
    }
}

$installer = new Installer($autoloader);
$installer->install();