<?php

use Apps\Core\Php\Entities\User;
use Apps\Core\Php\Entities\UserGroup;
use Webiny\Component\StdLib\Exception\ExceptionAbstract;

$autoloader = require_once getcwd() . '/vendor/autoload.php';

class Installer
{
    use \Webiny\Component\StdLib\StdLibTrait;

    private $domain;
    private $domainHost;
    private $databaseName = 'Webiny';
    private $absPath;
    private $errorLog;
    private $sitesEnabled = '/etc/nginx/sites-enabled/';
    private $sitesAvailable = '/etc/nginx/sites-available/';
    private $userEmail;
    private $userPassword;
    private $hostPath;

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
                    'login'  => [
                        'post' => true
                    ],
                    'me'     => [
                        'get' => true
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

        $this->collectData();
        $this->createFolders();
        //$this->installCoreApp(); // No need for this, as webiny/core is now installed through composer custom installer
        $this->createConfigs();
        $this->createHost();
        $this->autoloader->addPsr4('Apps\\Core\\', $this->absPath . 'Apps/Core');
        $this->setupEntitiesAndIndexes();
        $this->createUser();
    }

    private function collectData()
    {
        do {
            $this->domain = \cli\prompt('What is your development domain?', null, ': ');
        } while (!$this->domain);

        if (!$this->str($this->domain)->startsWith('http://') && !$this->str($this->domain)->startsWith('https://')) {
            $this->domain = 'http://' . $this->domain;
        }

        $this->domainHost = $this->url($this->domain)->getHost();
        $this->errorLog = '/var/log/nginx/' . $this->domainHost . '-error.log';
        $this->databaseName = \cli\prompt('What is your database name?', 'Webiny', ': ');

        $this->userEmail = \cli\prompt('What is your admin user email?', null, ': ');
        $this->userPassword = \cli\prompt('What is your admin user password?', null, ': ', true);
    }

    private function createFolders()
    {
        \cli\line("\nCreating necessary folder structure in %m{$this->absPath}%n");
        exec('cp -R ' . __DIR__ . '/install/structure/public_html ' . $this->absPath);
        exec('cp -R ' . __DIR__ . '/install/structure/Configs ' . $this->absPath);

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

    private function installCoreApp()
    {
        if (file_exists($this->absPath . 'Apps/Core')) {
            return;
        }

        \cli\line('Cloning %mwebiny/core%n app...');
        exec('git clone https://github.com/Webiny/Core.git ' . $this->absPath . 'Apps/Core');
    }

    private function createConfigs()
    {
        $this->injectVars('Configs/Production/Application.yaml');
        $this->injectVars('Configs/Production/Database.yaml');
        $this->injectVars('Configs/ConfigSets.yaml');
    }

    private function createHost()
    {
        $deployHost = \cli\choose('Would you like to create a virtual host for your domain', 'yn', 'y');
        if ($deployHost === 'y') {
            $host = $this->injectVars(__DIR__ . '/install/hosts/host.cfg', false);

            $hostPath = $this->sitesAvailable;
            $hostPath = \cli\prompt('Where do you want to place your host file?', $hostPath, $marker = ': ');
            $this->hostPath = $this->str($hostPath)->trimRight('/')->append('/')->val();
            file_put_contents(__DIR__ . '/host.tmp', $host);

            if (!file_exists($this->hostPath)) {
                mkdir($this->hostPath, 0755, true);
            }

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
                        return;
                    default:
                        $hostPath .= '-webiny-' . date('mdHis');
                }
            }

            exec('sudo cp ' . __DIR__ . '/host.tmp ' . $hostPath);
            \cli\line("Created host file: %c$hostPath%n");

            $link = $this->sitesEnabled . $this->domainHost;
            if (file_exists($link)) {
                exec("sudo unlink $link");
            }

            \cli\line("Symlink: %c$link%n -> %c$hostPath%n");

            exec('sudo ln -s ' . $hostPath . ' ' . $link);
            \cli\line("Attempting to reload nginx to enable your new host (%csudo service nginx reload%n)");
            exec('sudo service nginx reload');

            unlink(__DIR__ . '/host.tmp');
            \cli\line("\n%mIMPORTANT%n: If using a VM, make sure you add a rule for %c{$this->domainHost}%n domain on your host machine!");
        }
    }

    private function createUser()
    {
        $_SERVER = [];
        $_SERVER['SERVER_NAME'] = $this->domain;

        // Bootstrap the system using newly generated config
        \Apps\Core\Php\Bootstrap\Bootstrap::getInstance();

        // Create 'public' and 'administrators' user groups
        try {
            $publicGroup = new UserGroup();
            $publicGroup->populate($this->publicUserGroup)->save();
        } catch (ExceptionAbstract $e) {
            // Public group exists
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
            $user->email = $this->userEmail;
            $user->password = $this->userPassword;
            $user->fullName = '';
            $user->groups = [$adminGroup->id];
            $user->save();
        } catch (ExceptionAbstract $e) {
            // User exists
            \cli\line("\n%mWARNING%n: An admin user with email %c{$this->userEmail}%n already exists!");
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
            '{DOMAIN}'        => $this->domain,
            '{DOMAIN_HOST}'   => $this->domainHost,
            '{DATABASE_NAME}' => $this->databaseName,
            '{ERROR_LOG}'     => $this->errorLog
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