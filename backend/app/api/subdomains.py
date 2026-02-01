from fastapi import APIRouter, HTTPException, Path
from sqlmodel import Session, select

from app.models import Subdomain, SubdomainCreate, SubdomainUpdate, Target
from app.database import engine


router = APIRouter(
    prefix="/api/v1/targets/{target_id}/subdomains",
    tags=["Subdomains"]
)


@router.post("/")
async def create_subdomain(
    new_subdomain: SubdomainCreate,
    target_id: int = Path(..., gt=0, description="target id in the route")
) -> Subdomain:
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        subdomain = Subdomain(
            url=str(new_subdomain.url),
            title=new_subdomain.title,
            status=new_subdomain.status,
            target_id=target_id
        )
        session.add(subdomain)
        session.commit()
        session.refresh(subdomain)
        return subdomain


@router.patch("/{subdomain_id}")
async def update_subdomain(
    subdomain_id: int, 
    new_subdomain: SubdomainUpdate,
    target_id: int = Path(..., gt=0, description="target id in the route")
) -> Subdomain:
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        subdomain = session.exec(select(Subdomain)
                                 .where(Subdomain.target_id == target_id)
                                 .where(Subdomain.id == subdomain_id)).all()[0]
        if new_subdomain.url:
            subdomain.url = str(new_subdomain.url)
        if new_subdomain.title:
            subdomain.title = new_subdomain.title
        if new_subdomain.status:
            subdomain.status = new_subdomain.status
        session.add(subdomain)
        session.commit()
        session.refresh(subdomain)
        return subdomain


@router.delete("/{subdomain_id}")
async def delete_subdomain(
    subdomain_id: int,
    target_id: int = Path(..., gt=0, description="target id in the route")
):
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        subdomains = session.exec(select(Subdomain)
                                 .where(Subdomain.target_id == target_id)
                                 .where(Subdomain.id == subdomain_id)).all()
        if not subdomains:
            raise HTTPException(status_code=404, detail="Subdomain not found")
        session.delete(subdomains[0])
        session.commit()
        return {"ok": True}