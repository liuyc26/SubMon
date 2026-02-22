# SubMon

> Some say bug bounty isn't just about finding bugs, but being the "first" to find them. I'm building this tool to notify hunters when new subdomains appear.

## Tech Stack
### Backend: FastAPI
- ORM: SQLModel
- Data validation: Pydantic
- SQL DB: SQLite

### Frontend: React
- Vibe coding, tbh.

### Scanning Tools
- [subfinder](https://github.com/projectdiscovery/subfinder)
- [dnsx](https://github.com/projectdiscovery/dnsx)
- [httpx](https://github.com/projectdiscovery/httpx)

## Try It Yourself

```sh
# install tools
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/dnsx/cmd/dnsx@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
```

```py
# add config.py in backend/app/
DB_NAME: str = "DB-NAME.db"
discord_webhook_url: str = "YOUR-DISCORD-WEBHOOK"
```

```sh
# run fastapi service
cd backend
python -m app.main
# run worker in a new terminal
python -m app.worker

# Swagger doc
http://localhost:8000/docs

# ReDoc
http://localhost:8000/redoc
```

```sh
# run frontend
cd frontend
npm run dev
```

## Release notes 

Version #3 (Feb 22nd, 2026)

New Light/Dark mode switch.
![main](/img/v3_main.png)

Shows scanning status.
![scan](/img/v3_scan_status.png)

Set scheduled scan.
![scan](/img/v3_schedule.png)

Shows subdomain titles.
![title](/img/v3_target_title.png)

Version #2 (Feb 14th, 2026)

Dashboard main page.
![main](/img/v2_main.png)

Target page with more details.
![target](/img/v2_target.png)

Version #1 (Feb 1st, 2026)

Main page where you can add your favorite targets.
![main](/img/v1_main.png)

Target page where you can add subdomains.
![target](/img/v1_target.png)
