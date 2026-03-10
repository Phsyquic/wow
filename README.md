# wowAPP

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 14.1.2.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Backend and Discord bot

The project includes an Express backend under [server/server.js](/c:/Users/ivan_romero/Proyecto_personal/wow/server/server.js). It now exposes `GET /droptimizers` and can also listen to Discord messages to append valid Raidbots Droptimizer URLs into [src/assets/json/droptimizers.txt](/c:/Users/ivan_romero/Proyecto_personal/wow/src/assets/json/droptimizers.txt).

Start the backend:

```bash
cd server
npm install
$env:DISCORD_BOT_TOKEN="your_bot_token"
$env:DISCORD_CHANNEL_NAME="general"
node server.js
```

Optional variables:

- `DISCORD_CHANNEL_ID`: preferred for production, listens only to that channel ID.
- `DISCORD_GUILD_ID`: optional extra filter for a single Discord server.
- `DISCORD_CHANNEL_NAME`: fallback when no channel ID is configured. Defaults to `general`.
- `PORT`: backend port. Defaults to `3000`.

Validation rules for incoming Discord URLs:

- Only `https://raidbots.com/...` or `https://www.raidbots.com/...` report URLs are accepted.
- The backend fetches the report `data.json` and only stores it if `simbot.simType` is `droptimizer`.
- Duplicates are ignored.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
