import os
import platform
from fastapi import APIRouter, Depends
from security.auth import get_current_admin_user

router = APIRouter(dependencies=[Depends(get_current_admin_user)])

@router.get("/status")
async def admin_system_status():
    """ 
    A protected dashboard route. Returns system information and proof 
    that the admin is successfully authenticated. 
    """
    return {
        "status": "System Online",
        "shield": "Active",
        "sys_info": {
            "os": platform.system(),
            "release": platform.release(),
            "cpu_cores": os.cpu_count()
        },
        "log": [
            "Initializing deep scan...",
            "Loading network protocols...",
            "Access granted to Command Center."
        ]
    }
