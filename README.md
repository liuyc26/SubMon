# SubMon

> Some say bug bounty isn't just about finding bugs, but being the "first" to find them. I'm building this tool to notify hunters when new subdomains appear.

## Tech Stack
### Backend: FastAPI
- ORM: SQLModel
- Data validation: Pydantic
- SQL DB: SQLite

```sh
cd backend
python -m app.main
# run worker in a new terminal
python -m app.worker

# Swagger doc
http://localhost:8000/docs

# ReDoc
http://localhost:8000/redoc
```

### Frontend: React
- TBH, I'm not good at front end, so Copilot/Codex know this part better than me.

```sh
cd frontend
npm run dev
```

### Scanning Tools
- [subfinder](https://github.com/projectdiscovery/subfinder)
- [dnsx](https://github.com/projectdiscovery/dnsx)
- [httpx](https://github.com/projectdiscovery/httpx)

## Versions 

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

## TBD

Add scheduler