# DualPing

DualPing is a tool designed to continuously ping both your local router and an external IP. When the local router is reachable but the external IP isn't, it's indicative of an internet outage. This tool logs these outages to Google Calendar and sends notifications via Discord.

## Features:

- Pings the local router and an external IP at regular intervals.
- Logs internet outages to Google Calendar.
- Sends notifications of outages to Discord.
- Easily deployable with Docker.

## Prerequisites:

1. Node.js environment.
2. A service account with Google Calendar API permissions and its JSON key.
3. A Discord webhook URL for notifications.

## Setup:

1. Clone this repository.
2. Store your Google Service Account's JSON key in the root of this repository as `google.json`.
3. Update environment variables in `docker-compose.yml` or use an `.env` file.

## Usage:

1. Build and run the Docker container:

```bash
docker-compose up --build
```


2. Once running, it will continuously ping the defined IPs.
3. If you're running in TTY mode (`TTY_MODE=true`), pressing `t` will push a test event to Google Calendar.

## Configuration:

Most of the configuration is done via environment variables:

| Variable             | Description                                                | Default Value                               |
|----------------------|------------------------------------------------------------|---------------------------------------------|
| `TTY_MODE`           | Enable/disable TTY mode.                                   | `false`                                     |
| `LOCAL_ROUTER`       | IP of the local router to ping.                            | `8.8.8.8`                                   |
| `INTERNET_IP`        | External IP to ping to determine internet connectivity.    | `1.1.1.1`                                   |
| `DISCORD_WEBHOOK_URL`| The webhook URL for Discord notifications.                 | (Required)                                  |
| `CALENDAR_ID`        | Google Calendar's ID where outage events will be logged.   | `default`                                   |
| `LOCATION`           | A descriptor for the location of the monitor.              | `New Location`                              |
| `PING_COUNT`         | Number of failed pings to external IP before logging.      | `3`                                         |

## Generating the `google.json` Service Account Key:

1. **Google Cloud Console**:
    - Navigate to [Google Cloud Console](https://console.cloud.google.com/).
    - If you haven't already, create a new project.

2. **Enable Google Calendar API**:
    - In the left sidebar, navigate to `APIs & Services` > `Library`.
    - Search for "Google Calendar API" and select it.
    - Click on "Enable" to enable the Google Calendar API for your project.

3. **Create a Service Account**:
    - In the left sidebar, navigate to `IAM & Admin` > `Service Accounts`.
    - Click on "Create Service Account".
    - Provide a name and description for your service account, then click "Create".
    - For the role, select `Project` > `Editor`. Continue to the next step.
    - You don't need to grant users access to this service account, so you can just click "Done".

4. **Generate JSON Key**:
    - In the list of service accounts, find the one you just created and click on its name.
    - Under the `Keys` tab, click on "Add Key" and select `JSON`.
    - A JSON key file will be automatically downloaded to your machine. Rename this file to `google.json`.

5. **Share Calendar with Service Account**:
    - Go to [Google Calendar](https://calendar.google.com/).
    - Find the calendar you want to use (or create a new one).
    - Click on the three dots next to the calendar's name and choose `Settings and sharing`.
    - Under `Share with specific people`, click on "Add people".
    - Enter the email of the service account (it will look something like `your-service-account@your-project-id.iam.gserviceaccount.com`).
    - Set the permission to `Make changes to events` or as per your requirement.

6. **Place the JSON File**:
    - Move the `google.json` file to the root directory of your DualPing project.

Now your tool is set up to communicate with the Google Calendar API!

## Development Setup (Without Docker):

If you prefer to run the DualPing natively without Docker, follow these steps:

### Prerequisites:

1. Install [Node.js](https://nodejs.org/) and npm (usually comes bundled with Node.js).
2. Ensure you have `ping` utility available on your system.

### Steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/EpicnessTwo/DualPing
   cd DualPing
    ```
2. **Install Dependencies**:
   ```bash
    npm install
    ```
3. **Set Environment Variables**:
      Create a file named .env in the root of the project and set your environment variables like so:
    ```bash
    TTY_MODE=false
    LOCAL_ROUTER=10.0.0.1
    INTERNET_IP=1.1.1.1
    DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/xxx/yyy
    CALENDAR_ID=yourgooglecalendarlink@group.calendar.google.com
    LOCATION=New Location Test
    PING_COUNT=3
    ```
4. **Run the Script**:
    ```bash
    npm start
    ```

