<?php
use Webiny\Component\Storage\File\File;
use Webiny\Component\Storage\Storage;

$autoloader = require_once getcwd() . '/vendor/autoload.php';

class Release
{
    use \Webiny\Component\StdLib\StdLibTrait, \Webiny\Component\Config\ConfigTrait;

    private $map = [
        'Apps'        => [
            '!.*?\/?Js.*',
            '!.*?\.git.*',
            '.*'
        ],
        'Configs'     => [
            '.*\.(yaml)'
        ],
        'public_html' => [
            'build\/.*',
            'index.php'
        ],
        'vendor'      => [
            '!.*?\/(t|T)est.*',
            '!.*?\.git.*',
            '.*\.(php|crt)'
        ]
    ];

    public function __construct($autoloader)
    {
        $this->autoloader = $autoloader;
        $this->absPath = getcwd() . '/';
    }

    public function build()
    {
        $zipName = 'release-' . date('Y-m-d-His') . '.zip';
        \cli\line("Creating release archive '${zipName}'");
        @mkdir($this->absPath . 'releases');
        $zip = new ZipArchive();
        $zip->open($this->absPath . 'releases/' . $zipName, ZipArchive::CREATE);
        $storage = new Storage(new \Webiny\Component\Storage\Driver\Local\LocalStorageDriver($this->absPath));
        foreach ($this->map as $dir => $patterns) {
            $directory = new \Webiny\Component\Storage\Directory\Directory($dir, $storage, true);
            /* @var $f File */
            foreach ($directory as $f) {
                if ($this->match($f->getKey(), $patterns)) {
                    //echo $f->getKey() . "\n";
                    $zip->addFile($f->getAbsolutePath(), $f->getKey());
                }
            }
        }

        \cli\line("Added {$zip->numFiles} files to archive. Finalizing...");
        $zip->close();
        \cli\line("Release archive '{$zipName}' was written successfully!");

        if (\cli\choose('Do you want to deploy this new release to remote server', 'yn', 'y') === 'y') {

            do {
                $host = \cli\prompt('Enter host (eg. user@domain.com)', null, ': ');
            } while (!$host);

            do {
                $folder = \cli\prompt('Enter host root folder (eg. production)', null, ': ');
            } while (!$folder);

            $params = [
                $this->absPath . 'releases/' . $zipName,
                $host,
                $folder
            ];

            passthru('bash ' . __DIR__ . '/./deploy.sh ' . join(' ', $params));
        }
    }

    public function deploy()
    {

    }

    private function match($string, $patterns)
    {
        foreach ($patterns as $regex) {
            $regex = $this->str($regex);
            $shouldNotMatch = $regex->startsWith('!');
            if ($shouldNotMatch) {
                $regex->trimLeft('!');
            }
            $match = preg_match('/' . $regex->val() . '$/', $string);

            if ($match && $shouldNotMatch) {
                return false;
            }

            if ($match && !$shouldNotMatch) {
                return true;
            }
        }

        return false;
    }
}

$release = new Release($autoloader);
$release->build();