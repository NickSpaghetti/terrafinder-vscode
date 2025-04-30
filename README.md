# terrafinde-vscode README

An easy way to identify your terraform modules without leaving your editor.

## Features
* Depdnency Tree - See your terraform dependencies inside of vscode.

![Terrafinder Depdency Tree](/resources/demo.gif)

* Code Lense - Inspect any terraform module in another window.  Works with modules on your local machine or hosted on github.

![Terrafinder Code Lense](/resources/TerrafinderCodeLenseDemo.gif)

## Requirements

You must be logged into your github account.  This extension queries the github api for terraform files on github.

## Running locally
This project uses yarn as the package manager.  To build run the following command ```yarn compile```.
Go to the Run/Debug and select `Launch Terrafinder Extension`.