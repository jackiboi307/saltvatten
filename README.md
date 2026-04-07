# saltvatten

Barnsligt enkel chattapp integrerad med [Kattmysnätverket](https://kattmys.se). Den använder socketio, och datan lagras och överförs via json.

## server

En server skriven i js. Jag hostar den med `node server.js`. Nödvändiga filer är `data.json` och `config.json`.

## web-client

Det här är egentligen också en server, som förslagsvis kan hostas med nåt enkelt som `python -m http.server`, som användaren sedan ansluter till i webbläsaren. Webbklienten använder nunjucks för rendering. Observera att en `modules` mapp med några js-moduler krävs, men jag har inte laddat upp den.
