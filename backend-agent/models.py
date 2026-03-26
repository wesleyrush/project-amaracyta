
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, DateTime, UniqueConstraint,
    ForeignKey, Enum, Text, Index, Date, Boolean, Numeric
)
from sqlalchemy.orm import relationship
from db import Base

# --- User (auth) ---
class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(190), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name      = Column(String(255), nullable=True)
    initiatic_name = Column(String(255), nullable=True)
    birth_date     = Column(Date,        nullable=True)
    birth_time     = Column(String(5),   nullable=True)   # HH:MM
    birth_country  = Column(String(100), nullable=True)
    birth_state    = Column(String(100), nullable=True)
    birth_city     = Column(String(100), nullable=True)

    is_active    = Column(Boolean, nullable=False, default=True)
    is_admin     = Column(Boolean, nullable=False, default=False)
    coins_gold   = Column(Numeric(12, 7), nullable=False, default=0)
    coins_silver = Column(Numeric(12, 7), nullable=False, default=0)
    coins_bronze = Column(Numeric(12, 7), nullable=False, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    chat_sessions   = relationship("ChatSession", back_populates="user", cascade="all, delete")
    user_modules    = relationship("UserModule", back_populates="user", cascade="all, delete")
    children        = relationship("Child",       back_populates="user", cascade="all, delete")


# --- Module ---
class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(64), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    image_svg   = Column(Text, nullable=True)
    system_prompt = Column(Text, nullable=False)
    opening_prompt = Column(Text, nullable=True)
    few_shot = Column(Text, nullable=True)
    welcome_message = Column(Text, nullable=True)
    use_opening_prompt  = Column(Boolean, nullable=False, default=False)
    show_opening_prompt = Column(Boolean, nullable=False, default=False, server_default='0')
    is_active = Column(Boolean, nullable=False, default=True)
    module_type = Column(Enum('free', 'fixed'), nullable=False, default='free')
    price_brl   = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    sessions     = relationship("ChatSession", back_populates="module")
    user_modules = relationship("UserModule", back_populates="module")
    flow_steps   = relationship("ModuleFlowStep", back_populates="module", cascade="all, delete-orphan", order_by="ModuleFlowStep.step_order")


# --- Module Flow Steps ---
class ModuleFlowStep(Base):
    """Define os passos sequenciais do fluxo de um módulo.

    Cada passo pode exibir um botão ao usuário (button_label) e,
    quando acionado, envia um prompt_template ao agente (com variáveis
    do perfil do usuário/filho substituídas automaticamente).
    """
    __tablename__ = "module_flow_steps"
    __table_args__ = (UniqueConstraint("module_id", "step_order", name="uq_module_flow_step"),)

    id           = Column(Integer, primary_key=True, autoincrement=True)
    module_id    = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    step_order   = Column(Integer, nullable=False)           # 1, 2, 3 ...
    label        = Column(String(200), nullable=True)        # Descrição interna (admin)
    # Texto do botão exibido ANTES deste passo ser executado
    button_label    = Column(String(200), nullable=True)
    button_response = Column(String(400), nullable=True)   # Resposta do usuário exibida no chat ao clicar
    # Template do prompt enviado ao agente neste passo
    # Variáveis: {first} {full_name} {initiatic_name} {birth_date} {birth_time}
    #            {birth_country} {birth_state} {birth_city} {birth_location}
    prompt_template      = Column(Text, nullable=True)
    step_system_prompt   = Column(Text, nullable=True)   # Substitui o system_prompt do módulo neste passo
    include_user_profile = Column(Boolean, nullable=False, default=False)
    is_hidden            = Column(Boolean, nullable=False, default=True)  # Ocultar da UI
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    module = relationship("Module", back_populates="flow_steps")


# --- Module Package (bundle de módulos fixos) ---
class ModulePackage(Base):
    __tablename__ = "module_packages"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    quantity    = Column(Integer, nullable=False, unique=True)
    price_brl   = Column(Numeric(10, 2), nullable=False)
    description = Column(String(255), nullable=True)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at  = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))


# --- User Module (módulo fixo adquirido) ---
class UserModule(Base):
    __tablename__ = "user_modules"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id    = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity     = Column(Integer, nullable=False, default=1)
    order_id     = Column(Integer, nullable=True)
    purchased_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    user   = relationship("User",   back_populates="user_modules")
    module = relationship("Module", back_populates="user_modules")

    __table_args__ = (UniqueConstraint("user_id", "module_id", name="uq_user_module"),)


# --- Module Order (pedido de compra de módulos fixos) ---
class ModuleOrder(Base):
    __tablename__ = "module_orders"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    module_ids     = Column(Text, nullable=False)   # JSON array
    quantity       = Column(Integer, nullable=False)
    price_brl      = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(50), nullable=False)
    status         = Column(String(20), nullable=False, default='completed')
    created_at     = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


MessageRole = Enum('user', 'assistant', 'system', name='message_role')


class ChatSession(Base):
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    child_id  = Column(Integer, ForeignKey("children.id", ondelete="SET NULL"), nullable=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="Nova conversa")
    flow_step = Column(Integer, nullable=False, default=0)   # passos do fluxo já executados
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="chat_sessions")
    child = relationship("Child", back_populates="sessions")
    module = relationship("Module", back_populates="sessions")
    messages = relationship(
        "Message", back_populates="session", cascade="all, delete-orphan", order_by="Message.ts"
    )

    __table_args__ = (Index("idx_sessions_user_updated", "user_id", "updated_at"),)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(MessageRole, nullable=False)
    content = Column(Text, nullable=False)
    ts = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    coin_value = Column(Numeric(12, 7), nullable=True)
    coin_type  = Column(Enum('gold', 'silver', 'bronze'), nullable=True)
    hidden     = Column(Boolean, nullable=False, default=False)  # ocultar da UI do chat

    session = relationship("ChatSession", back_populates="messages")
    __table_args__ = (Index("idx_messages_session_ts", "session_id", "ts"),)


class CoinTransaction(Base):
    __tablename__ = "coin_transactions"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount      = Column(Numeric(12, 7), nullable=False)
    type        = Column(Enum('admin_credit', 'message_debit', 'chest_purchase', 'module_purchase'), nullable=False)
    coin_type   = Column(Enum('gold', 'silver', 'bronze'), nullable=True)
    description = Column(Text, nullable=True)
    created_at  = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class CoinChest(Base):
    __tablename__ = "coin_chests"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(100), nullable=False)
    coin_amount = Column(Numeric(12, 7), nullable=False)
    coin_type   = Column(String(10), nullable=False)   # 'gold' | 'silver' | 'bronze'
    price_brl   = Column(Numeric(10, 2), nullable=False)
    status      = Column(String(10), nullable=False, default='active')  # 'active' | 'inactive'
    created_at  = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at  = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))


class CoinOrder(Base):
    __tablename__ = "coin_orders"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    chest_id       = Column(Integer, nullable=True)
    chest_name     = Column(String(100), nullable=False)
    coin_type      = Column(String(10), nullable=False)   # 'gold' | 'silver' | 'bronze'
    coin_amount    = Column(Numeric(12, 7), nullable=False)
    price_brl      = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(50), nullable=False)
    status         = Column(String(20), nullable=False, default='completed')
    created_at     = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class CoinProportion(Base):
    __tablename__ = "coin_proportions"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    coin_type        = Column(Enum('gold', 'silver', 'bronze'), nullable=False, unique=True)
    cost_per_message = Column(Numeric(12, 7), nullable=False)
    updated_at       = Column(DateTime, nullable=False,
                              default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))


# --- Child (filho do cliente) ---
class Child(Base):
    __tablename__ = "children"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name      = Column(String(255), nullable=False)
    initiatic_name = Column(String(255), nullable=True)
    birth_date     = Column(Date,        nullable=True)
    birth_time     = Column(String(5),   nullable=True)
    birth_country  = Column(String(100), nullable=True)
    birth_state    = Column(String(100), nullable=True)
    birth_city     = Column(String(100), nullable=True)
    created_at     = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at     = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc),
                             onupdate=lambda: datetime.now(timezone.utc))

    user     = relationship("User",        back_populates="children")
    sessions = relationship("ChatSession", back_populates="child")


# --- Site Settings (key-value config for the frontend-agent) ---
class SiteSettings(Base):
    __tablename__ = "site_settings"

    key        = Column(String(64), primary_key=True)
    value      = Column(Text, nullable=False, default="")
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
