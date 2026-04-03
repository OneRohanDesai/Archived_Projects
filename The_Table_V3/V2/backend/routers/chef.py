from fastapi import APIRouter

router = APIRouter(prefix="/chef")

@router.get("/queue/{specialty}")
async def get_queue(specialty: str):
    from ..database import chef_queues
    return {"queue": chef_queues.get(specialty, [])}
