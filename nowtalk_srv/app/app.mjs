#! /usr/bin/env node

/*jshint esversion: 22 */

import { Command } from "commander";

import { existsSync, readFileSync, writeFileSync } from "fs";

import { SerialPort} from "serialport";


import MainClass from "./main.js";

import { argv, exit as _exit } from "process";

import { exit } from "process";

const version = "0.5.1";

const config = {
  commport: "none",
  baudrate: 115200,
  database: "./nowTalkSrv.sqlite",
  switchboardName: "SwitchBoard",
  callname: "computer",
  dynamicExtIP: false,
  externelIP: "",
  allowGuests: true,
  webAddress: "*", //127.0.0.1
  webPort: 1215,
  allowNewDevice: true,
  badgeTimeout: 60,
  config: "./nowTalkSrv.json",
  version: version,
};

const makeNumber = (input) => Number(input);

function loadConfig(args) {
  let inifile = args.config;
  let newConfig = {};

  if (inifile && existsSync(inifile)) {
    newConfig = JSON.parse(readFileSync(inifile, "utf-8"));
  }

  config.commport = args.port || newConfig.commport || config.commport;
  config.baudrate = makeNumber(
    args.baud || newConfig.baudrate || config.baudrate
  );
  config.database = args.sqlite || newConfig.database || config.database;
  config.switchboardName =
    args.name || newConfig.switchboardName || config.switchboardName;
  config.callname = args.callname || newConfig.callname || config.callname;
  config.allowGuests = newConfig.allowGuests || config.allowGuests;
  config.dynamicExtIP =
    args.dynamicIP || newConfig.dynamicExtIP || config.dynamicExtIP;
  config.externelIP =
    args.externelIP || newConfig.externelIP || config.externelIP;

  config.webAddress =
    args.webaddress || newConfig.webAddress || config.webAddress;
  config.webPort = args.webport || newConfig.webPort || config.webPort;
  config.badgeTimeout =
    args.timeout || newConfig.badgeTimeout || config.badgeTimeout;
}

loadConfig({ config: config.config });

const program = new Command();
program
  .version(version)
  .name("nowTalkSrv")
  .usage("[options]")
  .description(
    "The nowTalk Switchboard server for communicating over a serial port. Pressing ctrl+c exits."
  )
  .option(
    "-p, --port <commport>",
    "Commport name of the serial port",
    config.commport
  )
  .option("-b, --baud <baudrate>", "Used baudrate", config.baudrate)
  .option(
    "-n, --name <name>",
    "Name of this switchboard",
    config.switchboardName
  )
  .option(
    "-c, --callname <callname>",
    "Wake word to call command switchboard",
    config.callname
  )
  .option(
    "-t, --timeout <timeout> ",
    "Badge timeout in seconds.",
    config.badgeTimeout
  )
  .option("--db <sqlite>", "Database filename", config.database)
  .option(
    "--dynamicIP",
    "Your internet provider has gives dynamic IP's",
    config.dynamicExtIP
  )
  .option(
    "--IP <externelIP>",
    "Set your external IP address",
    config.externelIP
  )
  .option(
    "--webaddress <webaddress>",
    "Set the webservers address",
    config.webAddress
  )
  .option("--webport <webport>", "Set the webservers port", config.webPort)
  .option("--config <inifile>", "Alternate ini filename", config.config)
  .option("-s --silent", "Don't print console messages on the screen.")
  .option("-w --write", "Write configuration settings to file")
  .option("--demo", "demo mode")
  .parse(argv);

const args = program.opts();

loadConfig(args);

if (!args.list && args.write) {
  writeFileSync(args.ini, ini.stringify(config));
}

const listPorts = async () => {
  const ports = await SerialPort.list();
  for (const port of ports) {
    console.log(
      `${port.path}\t${port.pnpId || ""}\t${port.manufacturer || ""}`
    );
  }
};


  if (config.commport === "none") {

    const run = async () => {
      if (args.list) {
        listPorts();
        return;
      }

    console.log("No commport selected use the following statements to continue:");
    listPorts();
    _exit(1);
  }

  const main = new MainClass(config);
  await main.start();

};

run().catch((error) => {
  console.error(error);
  _exit(1);
});

function terminate() {
  // Add a 100ms delay, so the terminal will be ready when the process effectively exit, preventing bad escape sequences drop
  setTimeout(function () {
    term.processExit();
  }, 100);
}
