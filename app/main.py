from fastapi import FastAPI
from pydantic import BaseModel, HttpUrl

app = FastAPI()


class Program(BaseModel):
    name: str | None = None
    url: HttpUrl | None = None
    notes: str | None = None


programs: dict[str, dict] = {
    "0": {"name": "Foo", "url": "http://foo", "notes": ""},
    "1": {"name": "Bar", "url": "http://bar", "notes": ""},
    "2": {"name": "Baz", "url": "http://baz", "notes": ""}
}

@app.get("/api/v1/health")
def health_check() -> dict:
    return {"status": "ok"}


# TODO: build programs endpoints
@app.get("/api/v1/programs")
async def get_all_programs():
    return programs


@app.get("/api/v1/programs/{program_id}", response_model=Program)
async def get_program_by_id(program_id: str):
    return programs[program_id]


@app.post("/api/v1/programs", response_model=Program)
async def create_program(program: Program):
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

# TODO: build domains endpoints


# TODO: build scans endpoints


# TODO: build alerts endpoints


# TODO: build auth endpoints