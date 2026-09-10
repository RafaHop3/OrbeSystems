from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from pydantic import BaseModel, EmailStr
import uuid

# Re-use master ORBE dependencies
from security.auth import get_current_admin_user, get_password_hash
from inho_database import get_inho_db
from utils.logger import admin_logger
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

class CreateInhoUserSchema(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "operator"
    is_active: bool = True

class PatchInhoUserSchema(BaseModel):
    role: str

@router.get("/users")
async def list_inho_users(
    skip: int = 0,
    limit: int = 50,
    admin_email: str = Depends(get_current_admin_user),
    db: Session = Depends(get_inho_db)
):
    admin_logger.info(f"Admin {admin_email} fetching INHO database users directly (Encapsulated)")
    
    # We query the natively isolated INHO Database Schema directly
    query = text("""
        SELECT id, email, role, is_email_verified, created_at 
        FROM users 
        ORDER BY created_at DESC 
        OFFSET :skip LIMIT :limit
    """)
    result = db.execute(query, {"skip": skip, "limit": limit})
    
    users = []
    for row in result:
        users.append({
            "id": str(row[0]),
            "email": row[1],
            "full_name": "Administrador INHO",
            "role": row[2],
            "is_active": True,
            "created_at": row[4].isoformat() if row[4] else None,
            "is_verified": row[3],
            "is_mfa_enabled": False
        })
    return users

@router.post("/users")
@limiter.limit("5/minute")
async def create_inho_user(
    data: CreateInhoUserSchema,
    request: Request,
    admin_email: str = Depends(get_current_admin_user),
    db: Session = Depends(get_inho_db)
):
    from datetime import datetime, timezone
    
    check_query = text("SELECT id FROM users WHERE email = :email")
    if db.execute(check_query, {"email": data.email}).fetchone():
        raise HTTPException(status_code=400, detail="Identidade INHO ja existe")

    hashed_pw = get_password_hash(data.password)
    user_id = str(uuid.uuid4())
    
    insert_query = text("""
        INSERT INTO users (id, email, password_hash, role, is_email_verified, created_at) 
        VALUES (:id, :email, :hashed, :role, false, :now)
    """)
    now = datetime.now(timezone.utc)
    
    db.execute(insert_query, {
        "id": user_id,
        "email": data.email,
        "hashed": hashed_pw,
        "role": data.role,
        "now": now
    })
    db.commit()
    admin_logger.info(f"Encapsulated Dashboard created INHO user {data.email}")
    return {"status": "success", "user_id": user_id}

@router.patch("/users/{user_id}")
async def patch_inho_user(
    user_id: str,
    data: PatchInhoUserSchema,
    request: Request,
    admin_email: str = Depends(get_current_admin_user),
    db: Session = Depends(get_inho_db)
):
    update_query = text("UPDATE users SET role = :new_role WHERE id = :uid")
    result = db.execute(update_query, {"new_role": data.role, "uid": user_id})
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Usuario INHO nao encontrado na baselinie encapsulada")
    db.commit()
    return {"status": "success", "message": f"Role updated to {data.role}"}

@router.delete("/users/{user_id}")
async def delete_inho_user(
    user_id: str,
    request: Request,
    admin_email: str = Depends(get_current_admin_user),
    db: Session = Depends(get_inho_db)
):
    delete_query = text("DELETE FROM users WHERE id = :uid")
    res = db.execute(delete_query, {"uid": user_id})
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Usuario INHO nao encontrado")
    db.commit()
    return {"status": "success"}


@router.get("/audit-logs")
async def list_inho_audit_logs(
    skip: int = 0,
    limit: int = 50,
    admin_email: str = Depends(get_current_admin_user),
    db: Session = Depends(get_inho_db)
):
    admin_logger.info(f"Admin {admin_email} fetching INHO audit logs")
    query = text("""
        SELECT id, user_id, user_name, user_role, action, entity, entity_id, detail, ip_address, user_agent, timestamp as created_at
        FROM inho.audit_logs
        ORDER BY timestamp DESC
        OFFSET :skip LIMIT :limit
    """)
    try:
        result = db.execute(query, {"skip": skip, "limit": limit})
        logs = []
        for row in result:
            logs.append({
                "id": str(row[0]),
                "user_id": str(row[1]) if row[1] else None,
                "user_name": str(row[2]) if row[2] else "Sistema",
                "user_role": str(row[3]) if row[3] else "Automacao",
                "action": str(row[4]),
                "entity": str(row[5]),
                "entity_id": str(row[6]) if row[6] else None,
                "detail": str(row[7]) if row[7] else None,
                "ip_address": str(row[8]) if row[8] else None,
                "user_agent": str(row[9]) if row[9] else None,
                "created_at": row[10].isoformat() if row[10] else None
            })
        return logs
    except Exception as e:
        # Fallback to public if inho schema has issues
        admin_logger.error(f"Error fetching inho audit logs: {e}")
        query = text("""
            SELECT id, user_id, user_name, user_role, action, entity, entity_id, detail, ip_address, user_agent, timestamp as created_at
            FROM public.audit_logs
            ORDER BY timestamp DESC
            OFFSET :skip LIMIT :limit
        """)
        result = db.execute(query, {"skip": skip, "limit": limit})
        logs = []
        for row in result:
            logs.append({
                "id": str(row[0]),
                "user_id": str(row[1]) if row[1] else None,
                "user_name": str(row[2]) if row[2] else "Sistema",
                "user_role": str(row[3]) if row[3] else "Automacao",
                "action": str(row[4]),
                "entity": str(row[5]),
                "entity_id": str(row[6]) if row[6] else None,
                "detail": str(row[7]) if row[7] else None,
                "ip_address": str(row[8]) if row[8] else None,
                "user_agent": str(row[9]) if row[9] else None,
                "created_at": row[10].isoformat() if row[10] else None
            })
        return logs


@router.get("/system-metrics")
async def get_system_metrics(
    admin_email: str = Depends(get_current_admin_user)
):
    import boto3
    from datetime import datetime, timedelta, timezone
    admin_logger.info(f"Admin {admin_email} requested AWS System Metrics")
    try:
        client = boto3.client('cloudwatch', region_name='us-west-2')
        instance_id = 'i-058e26140671b3254'
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(minutes=5)
        
        cpu_metrics = client.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName='CPUUtilization',
            Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
            StartTime=start_time,
            EndTime=end_time,
            Period=300,
            Statistics=['Average']
        )
        
        net_in = client.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName='NetworkIn',
            Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
            StartTime=start_time,
            EndTime=end_time,
            Period=300,
            Statistics=['Sum']
        )
        
        net_out = client.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName='NetworkOut',
            Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
            StartTime=start_time,
            EndTime=end_time,
            Period=300,
            Statistics=['Sum']
        )
        
        cpu_val = cpu_metrics['Datapoints'][0]['Average'] if cpu_metrics.get('Datapoints') else 0.0
        ni_val = net_in['Datapoints'][0]['Sum'] if net_in.get('Datapoints') else 0.0
        no_val = net_out['Datapoints'][0]['Sum'] if net_out.get('Datapoints') else 0.0
        
        return {
            "status": "success",
            "metrics": {
                "cpu_percent": round(cpu_val, 2),
                "network_in_bytes": ni_val,
                "network_out_bytes": no_val,
                "instance_id": instance_id,
                "timestamp": end_time.isoformat()
            }
        }
    except Exception as e:
        admin_logger.error(f"Failed to fetch CloudWatch metrics: {e}")
        # Return fallback zeros so UI doesn't crash
        return {
            "status": "error",
            "message": str(e),
            "metrics": {
                "cpu_percent": 0.0,
                "network_in_bytes": 0.0,
                "network_out_bytes": 0.0,
                "instance_id": 'i-058e26140671b3254',
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
