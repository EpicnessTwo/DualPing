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
        console.error('Failed to authenticate with Google Calendar:', err);
        return;
    } else {
        console.log('Authenticated with Google Calendar.');
        console.log("Location:", LOCATION);
        console.log("Local Router IP:", LOCAL_ROUTER);
        console.log("Internet IP:", INTERNET_IP);
        console.log("Ping Interval:", PING_INTERVAL);
        if (TTY_MODE) {
            console.log('TTY Mode enabled, press "t" to push a test event.');
        } else {
            console.log('TTY Mode disabled, no testing events will be pushed.');
        }
    }
});

function logOutage() {
    if(!outageStart) return;
    const event = {
        summary: LOCATION + ' Internet Outage',
        description: 'Duration of internet outage.',
        start: {
            dateTime: outageStart.toISOString()
        },
        end: {
            dateTime: new Date().toISOString()
        }
    };

    calendar.events.insert({
        auth: jwtClient,
        calendarId: CALENDAR_ID,
        resource: event
    }, err => {
        if(err) console.error('Error logging event:', err);
        else {
            console.log('Logged outage to Google Calendar:', outageStart, 'to', new Date());
            sendDiscordNotification(outageStart, new Date()).then(() => {
                outageStart = null;
            }).catch(error => {
                console.error('Failed to send Discord notification:', error);
            });
        }
    });
}

function sendDiscordNotification(start, end) {
    const durationMinutes = (end - start) / (1000 * 60);
    return axios.post(DISCORD_WEBHOOK_URL, {
        content: `🚫 ${LOCATION} Internet Outage 🚫\nStarted: ${start.toISOString()}\nEnded: ${end.toISOString()}\nDuration: ${durationMinutes.toFixed(2)} minutes`
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
        if(err) console.error('Error pushing test event:', err);
        else console.log('Pushed test event to Google Calendar.');
    });
}

let failCount = 0;
setInterval(async () => {
    const localPing = await ping.promise.probe(LOCAL_ROUTER);
    const internetPing = await ping.promise.probe(INTERNET_IP);

    if (DEBUG_MODE) {
        console.log('Local Ping: ' + localPing.alive + ' ' + localPing.time + 'ms | Internet Ping: ' + internetPing.alive + ' ' + internetPing.time + 'ms');
    }

    if(localPing.alive && !internetPing.alive) {
        failCount++;
        if (failCount >= PING_COUNT) {
            console.log('Outage Detected!');
            if(!outageStart) outageStart = new Date();
        }
    } else if(outageStart) {
        failCount = 0;
        console.log('Outage Finished!');
        logOutage();
    }
}, PING_INTERVAL);