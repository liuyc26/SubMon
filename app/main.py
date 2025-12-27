from fastapi import FastAPI
from pydantic import BaseModel, HttpUrl

app = FastAPI()


class Program(BaseModel):
    name: str | None = None
    url: HttpUrl | None = None
    notes: str | None = None


class Subdomain(BaseModel):
    hostname: str | None = None
    status: str | None = None


# TODO: replace with database
programs: dict[str, dict] = {
    "0": {"name": "Foo", "url": "http://foo", "notes": ""},
    "1": {"name": "Bar", "url": "http://bar", "notes": ""},
    "2": {"name": "Baz", "url": "http://baz", "notes": ""},
}

subdomains: dict[str, dict] = {
    "1": {
        "0": {"hostname": "dev", "status": "active"}, 
        "1": {"hostname": "test", "status": "active"}, 
        "2": {"hostname": "backup", "status": "inactive"},
    },
    "2": {
        "0": {"hostname": "staging1", "status": "active"},
        "1": {"hostname": "staging2", "status": "active"},
    }
}


@app.get("/api/v1/health")
def health_check() -> dict:
    return {"status": "ok"}


# programs endpoints
@app.get("/api/v1/programs")
async def get_all_programs():
    return programs


@app.get("/api/v1/programs/{program_id}", response_model=Program)
async def get_program_by_id(program_id: str):
    return programs[program_id]


@app.post("/api/v1/programs", response_model=Program)
async def add_program(program: Program):
    programs[str(len(programs))] = program.model_dump()
    return program


@app.patch("/api/v1/programs/{program_id}", response_model=Program)
async def update_program(program_id: str, program: Program):
    updates = program.model_dump(exclude_unset=True)
    if updates:
        programs[program_id].update(updates)
    return programs[program_id]


@app.delete("/api/v1/programs/{program_id}")
async def delete_program(program_id: str):
    del programs[program_id]
    return {"message": "success"}

# domains endpoints
@app.get("/api/v1/programs/{program_id}/subdomains")
async def get_subdomains(program_id: str) -> dict:
    return subdomains.get(program_id, {})


@app.post("/api/v1/programs/{program_id}/subdomains")
async def add_subdomains(program_id: str, subdomain_list: list[Subdomain]) -> dict[str, dict]:
    count: int = len(subdomains.get(program_id, {}))
    for subdomain in subdomain_list:
        subdomains.get(program_id, {})[str(count)] = subdomain
        count += 1
    return subdomains


@app.patch("/api/v1/programs/{program_id}/subdomains/{subdomain_id}", response_model=Subdomain)
async def update_subdomains(program_id: str, subdomain_id: str, subdomain: Subdomain):
    updates = subdomain.model_dump(exclude_unset=True)
    if updates:
        subdomains.get(program_id, {}).get(subdomain_id, {}).update(updates)
    return subdomains.get(program_id, {}).get(subdomain_id, {})


@app.delete("/api/v1/programs/{program_id}/subdomains/{subdomain_id}")
async def delete_subdomains(program_id: str, subdomain_id: str):
    del subdomains[program_id][subdomain_id]
    return {"message": "success"}


# TODO: build scans endpoints
# TODO: build alerts endpoints
# TODO: build auth endpoints
