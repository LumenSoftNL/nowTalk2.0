#! /usr/bin/env node

/*jshint esversion: 22 */

import { Command } from "commander";

import { existsSync, readFileSync, writeFileSync } from "fs";

import { SerialPort } from "serialport";

import MainClass from "./main.js";

import { argv, exit as _exit } from "process";

import { exit } from "process";

const version = "1.1.51";

// this should be changed to lower cases
const config = {
  serialport: "/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0", //"/dev/ttyUSB1",
  baudrate: 512000,
  database: "./nowTalkSrv.sqlite",
  server_name: "SwitchBoard",
  call_name: "computer",
  dynamic_ext_ip: false,
  external_ip: "",
  allow_guests: false,

  allow_new_device: true,
  badge_timeout: 60,

  version: version,
};

const makeNumber = (input) => Number(input);

function loadConfig(args) {
  let inifile = args.config;
  let newConfig = {};

  if (inifile && existsSync(inifile)) {
    newConfig = JSON.parse(readFileSync(inifile, "utf-8"));
  }

  config.serialport =
    args.serialport || newConfig.serialport || config.serialport;
  config.baudrate = makeNumber(
    args.baudrate || newConfig.baudrate || config.baudrate
  );
  config.database = args.database || newConfig.database || config.database;
  config.server_name =
    args.server_name || newConfig.server_name || config.server_name;
  config.call_name = args.call_name || newConfig.call_name || config.call_name;

  config.external_ip =
    args.external_ip || newConfig.external_ip || config.external_ip;
  config.dynamic_ext_ip =
    args.dynamic_ext_ip || newConfig.dynamic_ext_ip || config.dynamic_ext_ip;
  config.allow_guests = newConfig.allow_guests || config.allow_guests;

  config.badge_timeout =
    args.badge_timeout || newConfig.badge_timeout || config.badge_timeout;
}

loadConfig({ config: config.config });

const program = new Command();
program
  .version(version)
  .name("nowTalkSrv")
  .usage("[options]")
  .description(
    "The nowTalk server for communicating over a serial port. Pressing ctrl+c exits."
  )
  .option("-p, --port <serialport>", "serial port name", config.serialport)
  .option("-b, --baud <baudrate>", "Used baudrate", config.baudrate)
  .option(
    "-n, --name <server_name>",
    "Name of this switchboard",
    config.server_name
  )
  .option(
    "-c, --call_name <call_name>",
    "Wake word to call command switchboard",
    config.call_name
  )
  .option(
    "-t, --timeout <badge_timeout> ",
    "Badge timeout in seconds.",
    config.badge_timeout
  )
  .option("--db <database>", "Database filename", config.database)
  .option(
    "--dynamicIP <dynamic_ext_ip>",
    "Has your internet provider has gives dynamic IP's",
    config.dynamic_ext_ip
  )
  .option(
    "--IP <external_ip>",
    "Set your external IP address",
    config.external_ip
  )
  .option(
    "--config <config>",
    "Alternate configuration file filename",
    config.config
  )
  .option("-s --silent", "Don't print console messages on the screen.")
  .option("-w --write", "Write configuration settings to file")
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

const run = async () => {
  console.log(
    "No serialport selected use the following statements to continue:"
  );
  listPorts();
};

const main = new MainClass(config);
await main.start();

function terminate() {
  // Add a 100ms delay, so the terminal will be ready when the process effectively exit, preventing bad escape sequences drop
  setTimeout(function () {
    term.processExit();
  }, 100);
}
