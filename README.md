## Staser - Static Server

![](./resources/staser.png)

## Why Staser?

- Directory listing
- Easily modifiable frontend
- Upload files
- Download all files (one click)

## Quick Start

### instalation:

Optionally you can specify the installation paths (-h to see the default ones).

```shell
python3 install.py -h
```

if you want to put it in a privileged path like /bin but you want to keep your directories as a normal user (if the directory does not exist, in the process it is created), use --user-uid and execute as a root.

```shell
sudo python3 install.py -p /bin --user-uid 1000
```

### usage:

simply specify the directory, ip(optional) and port(optional)

```shell
staser -d /etc/ -i 127.0.0.9 -p 1
```