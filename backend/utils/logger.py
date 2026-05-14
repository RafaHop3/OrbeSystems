"""
utils/logger.py — Centralized Logging Configuration
════════════════════════════════════════════════════
Configuração centralizada de logging para o backend.
"""

import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Create loggers for different modules
auth_logger = logging.getLogger("orbe.auth")
admin_logger = logging.getLogger("orbe.admin")
user_logger = logging.getLogger("orbe.users")
project_logger = logging.getLogger("orbe.projects")
payment_logger = logging.getLogger("orbe.payment")
webhook_logger = logging.getLogger("orbe.webhooks")
