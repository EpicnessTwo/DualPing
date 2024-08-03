const {google} = require('googleapis');
const ping = require('ping');
const fs = require('fs');
const axios = require('axios');
const readline = require('readline');
const dotenv = require('dotenv');
dotenv.config();

const LOCAL_ROUTER = process.env.LOCAL_ROUTER || '8.8.8.8'; // Replace with your router's IP.
const INTERNET_IP = process.env.INTERNET_IP || '1.1.1.1';
const PING_INTERVAL = process.env.PING_INTERVAL || 5000; // 5 seconds
const CREDENTIALS_PATH = 'google.json'; // Update with your path.
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ''; // Replace with your Discord webhook URL.
const CALENDAR_ID = process.env.CALENDAR_ID || 'default';
const LOCATION = process.env.LOCATION || 'New Location';
const TTY_MODE = process.env.TTY_MODE === 'true';
const PING_COUNT = process.env.PING_COUNT || 3;
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

let outageStart = null;

if (TTY_MODE) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', (str, key) => {
        if (key.name === 't') {
            pushTestEvent();
        }
        // To allow graceful exit of the script on pressing 'c' with ctrl
        if (key.ctrl && key.name === 'c') {
            process.exit();
        }
    });
}


const calendar = google.calendar('v3');
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const jwtClient = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/calendar']
);

jwtClient.authorize(err => {
    if(err) {
        consoleLog('error', 'Failed to authenticate with Google Calendar:', err);
    } else {
        consoleLog('info', 'Authenticated with Google Calendar.');
        consoleLog('info', "Location:", LOCATION);
        consoleLog('info', "Local Router IP:", LOCAL_ROUTER);
        consoleLog('info', "Internet IP:", INTERNET_IP);
        consoleLog('info', "Ping Interval:", PING_INTERVAL);
        if (TTY_MODE) {
            consoleLog('info', 'TTY Mode enabled, press "t" to push a test event.');
        } else {
            consoleLog('info', 'TTY Mode disabled, no testing events will be pushed.');
        }
    }
});

function consoleLog(type, message) {
    if (type === 'debug' && !DEBUG_MODE) return;
    console.log(`[${new Date().toISOString()}] [${type.toUpperCase()}] ${message}`);
}

function logOutage(start, end) {
    if (!start || !end) return;

    const event = {
        summary: LOCATION + ' Internet Outage',
        description: 'Duration of internet outage.',
        start: {
            dateTime: start.toISOString()
        },
        end: {
            dateTime: end.toISOString()
        }
    };

    calendar.events.insert({
        auth: jwtClient,
        calendarId: CALENDAR_ID,
        resource: event
    }, err => {
        if(err) consoleLog('error','Error logging event:', err);
        else {
            consoleLog('info', 'Logged outage to Google Calendar: ' + start + ' to ' + end);
            sendDiscordNotification(start, end).then(() => {
                outageStart = null;
            }).catch(error => {
                consoleLog('error', 'Failed to send Discord notification: ' + error);
            });
        }
    });
}

function sendDiscordNotification(start, end) {
    const durationMinutes = (end - start) / (1000 * 60);
    return axios.post(DISCORD_WEBHOOK_URL, {
        "content": null,
        "embeds": [
            {
                "title": `${LOCATION} Internet Outage`,
                "color": 16726072,
                "fields": [
                    {
                        "name": "Outage Start",
                        "value": `${start.toISOString()}`,
                        "inline": true
                    },
                    {
                        "name": "Outage Ended",
                        "value": `${end.toISOString()}`,
                        "inline": true
                    },
                    {
                        "name": "Duration",
                        "value": `${durationMinutes.toFixed(2)} minutes`
                    }
                ],
                "author": {
                    "name": "DualPing Alert",
                    "url": "https://github.com/EpicnessTwo/DualPing"
                },
                "footer": {
                    "text": "Powered by DualPing | https://github.com/EpicnessTwo/DualPing"
                }
            }
        ],
        "username": "DualPing Alerts",
        "attachments": []
    });
}

function pushTestEvent() {
    const event = {
        summary: LOCATION + ' Test Event',
        description: 'This is a test event triggered by pressing the letter T.',
        start: {
            dateTime: new Date().toISOString()
        },
        end: {
            dateTime: new Date(Date.now() + 60000).toISOString() // Assuming 1 minute long test event.
        }
    };

    calendar.events.insert({
        auth: jwtClient,
        calendarId: CALENDAR_ID,
        resource: event
    }, err => {
        if(err) consoleLog('error', 'Error pushing test event: ' + err);
        else consoleLog('info', 'Pushed test event to Google Calendar.');
    });
}

let failCount = 0;
setInterval(async () => {
    const localPing = await ping.promise.probe(LOCAL_ROUTER);
    const internetPing = await ping.promise.probe(INTERNET_IP);

    consoleLog('debug', 'Local Ping: ' + localPing.alive + ' ' + localPing.time + 'ms | Internet Ping: ' + internetPing.alive + ' ' + internetPing.time + 'ms');


    if (localPing.alive && !internetPing.alive) {
        failCount++;
        if (failCount >= PING_COUNT) {
            consoleLog('warn', 'Outage Detected!');
            if(!outageStart) outageStart = new Date();
        }
    } else if(outageStart) {
        failCount = 0;
        consoleLog('info', 'Outage Finished!');
        await logOutage(outageStart, new Date());
    }
}, PING_INTERVAL);