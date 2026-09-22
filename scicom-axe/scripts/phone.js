#!/usr/bin/env node
'use strict';
/**
 * phone.js — start Scicom Axe so a phone on the same Wi-Fi can reach it.
 *
 *     npm run phone
 *
 * This exists as its own file rather than as `HOST=0.0.0.0 npm start`, because
 * that syntax does not work in Windows PowerShell, which is where this is
 * mostly going to be run.
 *
 * Normal `npm start` listens only on this computer. This one listens on the
 * network, which means anybody else on the same Wi-Fi can open it — there is
 * no password. The server prints a warning saying so when it starts.
 */

process.env.HOST = '0.0.0.0';
require('../server.js');
