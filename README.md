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

## Version #1 (02/01/2026)
Main page where you can add your favorite targets.
![main](/img/v1_main.png)

Target page where you can add subdomains.
![target](/img/v1_target.png)

## TBD

Of course, this is an automation tool. I will build the scanning part soon.