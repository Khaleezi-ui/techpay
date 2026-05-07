import { useState, useRef, useCallback } from "react";

// ─── Datos iniciales ───────────────────────────────────────────────────────
const INITIAL_SUPERVISORS = [
  { id: 1, name: "JUAN PÉREZ", active: true },
  { id: 2, name: "MARÍA GARCÍA", active: true },
  { id: 3, name: "CARLOS MENDOZA", active: true },
];

const INITIAL_RESOURCES = [
  { id: 1, number: "REC-001", description: "Equipo de fibra óptica", active: true },
  { id: 2, number: "REC-002", description: "Kit de pruebas eléctricas", active: true },
  { id: 3, number: "REC-003", description: "Camioneta de servicio", active: true },
];

const INITIAL_TECHNICIANS = [
  { id: 1, name: "ROBERTO SILVA", active: true },
  { id: 2, name: "ANDRÉS LÓPEZ", active: true },
];

const INITIAL_WORKS = [
  {
    id: 1,
    startDatetime: "2026-05-01T08:00",
    endDatetime: "2026-05-01T16:00",
    technician: "ROBERTO SILVA",
    assistant: "PEDRO RAMOS",
    supervisor: "JUAN PÉREZ",
    resource: "REC-001",
    sa: "SA-2024-001",
    workOrder: "OT-5892",
    description: "Instalación de fibra óptica en edificio central",
    authImage: null,
  },
  {
    id: 2,
    startDatetime: "2026-05-02T09:00",
    endDatetime: "2026-05-02T17:30",
    technician: "ANDRÉS LÓPEZ",
    assistant: "",
    supervisor: "MARÍA GARCÍA",
    resource: "REC-002",
    sa: "SA-2024-002",
    workOrder: "OT-5893",
    description: "Revisión y mantenimiento de equipos eléctricos",
    authImage: null,
  },
];

const USERS = [
  { username: "admin", password: "admin123", role: "admin", displayName: "Administrador" },
  { username: "tecnico", password: "tec123", role: "technician", displayName: "Técnico Demo" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtDt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const calcHours = (start, end) => {
  if (!start || !end) return null;
  const d = (new Date(end) - new Date(start)) / 3600000;
  return Math.round(d * 10) / 10;
};

const sanitizeName = (v) =>
  v.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ\s]/g, "").replace(/\s{2,}/g, " ");

const nextId = (arr) => (arr.length ? Math.max(...arr.map((x) => x.id)) + 1 : 1);

// ─── CSV Export ────────────────────────────────────────────────────────────
const exportCSV = (works) => {
  const headers = [
    "fecha_inicio","fecha_fin","tecnico","ayudante","supervisor",
    "recurso","SA","orden_trabajo","descripcion","horas_total",
  ];
  const rows = works.map((w) => [
    fmtDt(w.startDatetime), fmtDt(w.endDatetime), w.technician,
    w.assistant, w.supervisor, w.resource, w.sa, w.workOrder,
    `"${w.description}"`, calcHours(w.startDatetime, w.endDatetime) ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "reporte_techpay.csv"; a.click();
  URL.revokeObjectURL(url);
};

// ─── UI Atoms ──────────────────────────────────────────────────────────────
const Badge = ({ children, variant = "default" }) => {
  const cls = {
    default: "bg-slate-700 text-slate-300",
    success: "bg-teal-900 text-teal-300",
    warning: "bg-amber-900 text-amber-300",
    danger: "bg-red-900 text-red-300",
    info: "bg-blue-900 text-blue-300",
  }[variant];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
};

const Input = ({ label, error, required, className = "", ...props }) => (
  <div className={`space-y-1 ${className}`}>
    {label && (
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
    )}
    <input
      {...props}
      className={`w-full bg-slate-800 border ${error ? "border-red-500" : "border-slate-700"
        } text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition`}
    />
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
);

const Select = ({ label, error, required, children, className = "", ...props }) => (
  <div className={`space-y-1 ${className}`}>
    {label && (
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
    )}
    <select
      {...props}
      className={`w-full bg-slate-800 border ${error ? "border-red-500" : "border-slate-700"
        } text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition appearance-none`}
    >
      {children}
    </select>
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
);

const Textarea = ({ label, error, required, className = "", ...props }) => (
  <div className={`space-y-1 ${className}`}>
    {label && (
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
    )}
    <textarea
      {...props}
      rows={3}
      className={`w-full bg-slate-800 border ${error ? "border-red-500" : "border-slate-700"
        } text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none`}
    />
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
);

const Btn = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
  const base = "inline-flex items-center gap-1.5 font-semibold rounded-lg transition focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-sm" };
  const variants = {
    primary: "bg-amber-500 hover:bg-amber-400 text-slate-950",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700",
    teal: "bg-teal-600 hover:bg-teal-500 text-white",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Modal = ({ title, onClose, children, size = "md" }) => {
  const maxW = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4" onClick={onClose}>
      <div
        className={`bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full ${maxW} max-h-screen overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const Alert = ({ type = "error", message, onClose }) => {
  if (!message) return null;
  const cls = {
    error: "bg-red-950 border-red-800 text-red-300",
    success: "bg-teal-950 border-teal-800 text-teal-300",
    warning: "bg-amber-950 border-amber-800 text-amber-300",
  }[type];
  return (
    <div className={`flex items-start gap-2 border rounded-lg px-4 py-3 text-sm ${cls}`}>
      <span className="flex-1">{message}</span>
      {onClose && <button onClick={onClose} className="text-current opacity-60 hover:opacity-100 text-base leading-none">×</button>}
    </div>
  );
};

// ─── Login ─────────────────────────────────────────────────────────────────
function LoginView({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const found = USERS.find((u) => u.username === user && u.password === pass);
      if (found) { setErr(""); onLogin(found); }
      else { setErr("Usuario o contraseña incorrectos."); }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl mb-4 text-3xl">
            ⚙
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">TechPay</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de pagos por hora de técnicos</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Usuario"
              required
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="admin / tecnico"
              autoFocus
            />
            <Input
              label="Contraseña"
              required
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
            {err && <Alert type="error" message={err} onClose={() => setErr("")} />}
            <Btn type="submit" variant="primary" size="lg" className="w-full justify-center" disabled={loading}>
              {loading ? "Verificando..." : "Iniciar sesión"}
            </Btn>
          </form>
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-slate-500 text-xs text-center mb-2">Credenciales de demo</p>
            <div className="grid grid-cols-2 gap-2">
              {USERS.map((u) => (
                <button
                  key={u.username}
                  onClick={() => { setUser(u.username); setPass(u.password); }}
                  className="text-left bg-slate-800 hover:bg-slate-700 rounded-lg p-2.5 transition"
                >
                  <p className="text-amber-400 text-xs font-mono font-medium">{u.username}</p>
                  <p className="text-slate-500 text-xs">{u.displayName}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Crédito */}
        <div className="mt-6 text-center space-y-0.5">
          <p className="text-slate-600 text-xs">Desarrollado por</p>
          <p className="text-slate-400 text-sm font-semibold tracking-wide">Tobías Vázquez</p>
          <a
            href="tel:+595983993060"
            className="inline-flex items-center gap-1.5 text-amber-500 hover:text-amber-400 text-xs font-mono transition"
          >
            📞 +595 983 993 060
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Nav ───────────────────────────────────────────────────────────
const NAV = [
  { id: "works", label: "Registrar trabajo", icon: "➕", roles: ["admin", "technician"] },
  { id: "list", label: "Lista de trabajos", icon: "📋", roles: ["admin", "technician"] },
  { id: "admin", label: "Administración", icon: "⚙", roles: ["admin"] },
  { id: "reports", label: "Reportes", icon: "📊", roles: ["admin"] },
];

function Sidebar({ view, setView, user, onLogout }) {
  const items = NAV.filter((n) => n.roles.includes(user.role));
  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-slate-900 border-r border-slate-800 flex flex-col z-30">
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 font-bold text-sm">⚙</div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">TechPay</p>
            <p className="text-slate-500 text-xs">v1.0</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition text-left ${view === n.id
              ? "bg-amber-500 text-slate-950 font-semibold"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
          >
            <span className="text-base">{n.icon}</span>
            <span className="leading-tight">{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
          <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300">
            {user.displayName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-300 text-xs font-medium truncate">{user.displayName}</p>
            <p className="text-slate-500 text-xs capitalize">{user.role === "admin" ? "Administrador" : "Técnico"}</p>
          </div>
        </div>
        <Btn variant="ghost" size="sm" className="w-full justify-center" onClick={onLogout}>
          Cerrar sesión
        </Btn>
      </div>
    </aside>
  );
}

// ─── Work Registration Form ────────────────────────────────────────────────
const EMPTY_FORM = {
  startDatetime: "", endDatetime: "", technician: "", assistant: "",
  supervisor: "", resource: "", sa: "", workOrder: "", description: "", authImage: null,
};

function WorkForm({ supervisors, resources, technicians, works, onSave, editWork = null }) {
  const [form, setForm] = useState(editWork || EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [imgPreview, setImgPreview] = useState(editWork?.authImage || null);
  const [success, setSuccess] = useState("");
  const fileRef = useRef();

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: null })); };

  const validate = () => {
    const e = {};
    if (!form.startDatetime) e.startDatetime = "Campo obligatorio";
    if (!form.endDatetime) e.endDatetime = "Campo obligatorio";
    if (form.startDatetime && form.endDatetime && new Date(form.endDatetime) <= new Date(form.startDatetime))
      e.endDatetime = "Debe ser posterior a la fecha/hora de inicio";
    if (!form.technician.trim()) e.technician = "Campo obligatorio";
    else if (!/^[A-ZÁÉÍÓÚÜÑ\s]+$/.test(form.technician.trim()))
      e.technician = "Solo letras mayúsculas permitidas";
    else {
      const dup = works.find(
        (w) => w.technician === form.technician.trim() &&
          w.id !== editWork?.id &&
          form.startDatetime && form.endDatetime &&
          w.startDatetime === form.startDatetime && w.endDatetime === form.endDatetime
      );
      if (dup) e.technician = "Ya existe un registro con este técnico en ese horario";
    }
    if (!form.supervisor) e.supervisor = "Campo obligatorio";
    if (!form.resource) e.resource = "Campo obligatorio";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    onSave({ ...form, technician: form.technician.trim(), authImage: imgPreview });
    if (!editWork) {
      setForm(EMPTY_FORM);
      setImgPreview(null);
      setSuccess("✓ Trabajo registrado correctamente");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleImg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((p) => ({ ...p, authImage: "Solo se aceptan archivos JPG o PNG" })); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => { setImgPreview(ev.target.result); setErrors((p) => ({ ...p, authImage: null })); };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && <Alert type="success" message={success} onClose={() => setSuccess("")} />}

      {/* Fechas */}
      <div className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest">Fechas y horario</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Fecha/hora inicio" required type="datetime-local"
            value={form.startDatetime} onChange={(e) => set("startDatetime", e.target.value)}
            error={errors.startDatetime} />
          <Input label="Fecha/hora fin" required type="datetime-local"
            value={form.endDatetime} onChange={(e) => set("endDatetime", e.target.value)}
            error={errors.endDatetime} />
        </div>
        {form.startDatetime && form.endDatetime && !errors.endDatetime && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">Duración:</span>
            <Badge variant={calcHours(form.startDatetime, form.endDatetime) > 0 ? "success" : "danger"}>
              {calcHours(form.startDatetime, form.endDatetime)} horas
            </Badge>
          </div>
        )}
      </div>

      {/* Personal */}
      <div className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest">Personal</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              Técnico<span className="text-amber-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={form.technician}
              onChange={(e) => set("technician", sanitizeName(e.target.value))}
              placeholder="NOMBRE EN MAYÚSCULAS"
              className={`w-full bg-slate-900 border ${errors.technician ? "border-red-500" : "border-slate-700"} text-white rounded-lg px-3 py-2.5 text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition`}
            />
            {errors.technician && <p className="text-red-400 text-xs">{errors.technician}</p>}
            <p className="text-slate-600 text-xs">Se convierte automáticamente a mayúsculas</p>
          </div>
          <Input label="Ayudante" type="text"
            value={form.assistant} onChange={(e) => set("assistant", e.target.value)}
            placeholder="Opcional" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Supervisor" required value={form.supervisor}
            onChange={(e) => set("supervisor", e.target.value)} error={errors.supervisor}>
            <option value="">Seleccionar supervisor...</option>
            {supervisors.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </Select>
          <Select label="Número de recurso" required value={form.resource}
            onChange={(e) => set("resource", e.target.value)} error={errors.resource}>
            <option value="">Seleccionar recurso...</option>
            {resources.filter((r) => r.active).map((r) => (
              <option key={r.id} value={r.number}>{r.number} — {r.description}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Trabajo */}
      <div className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest">Datos del trabajo</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="SA" type="text" value={form.sa}
            onChange={(e) => set("sa", e.target.value)} placeholder="SA-2024-001" />
          <Input label="Orden de trabajo" type="text" value={form.workOrder}
            onChange={(e) => set("workOrder", e.target.value)} placeholder="OT-5892" />
        </div>
        <Textarea label="Descripción breve"
          value={form.description} onChange={(e) => set("description", e.target.value)}
          placeholder="Descripción del trabajo realizado..." />
      </div>

      {/* Imagen */}
      <div className="bg-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest">Autorización</h3>
        <div
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl p-6 text-center cursor-pointer transition"
        >
          {imgPreview ? (
            <img src={imgPreview} alt="Autorización" className="max-h-32 mx-auto rounded-lg object-contain" />
          ) : (
            <>
              <div className="text-3xl mb-2">📸</div>
              <p className="text-slate-400 text-sm">Click para subir imagen de autorización</p>
              <p className="text-slate-600 text-xs mt-1">JPG o PNG únicamente</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImg} />
        {errors.authImage && <p className="text-red-400 text-xs">{errors.authImage}</p>}
        {imgPreview && (
          <Btn variant="ghost" size="sm" onClick={() => { setImgPreview(null); fileRef.current.value = ""; }}>
            Quitar imagen
          </Btn>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Btn type="submit" variant="primary" size="lg">
          {editWork ? "Guardar cambios" : "✓ Registrar trabajo"}
        </Btn>
      </div>
    </form>
  );
}

// ─── Works List ────────────────────────────────────────────────────────────
function WorksList({ works, onDelete, onEdit, user }) {
  const [search, setSearch] = useState("");
  const [imgModal, setImgModal] = useState(null);

  const filtered = works.filter((w) =>
    [w.technician, w.supervisor, w.workOrder, w.sa, w.description]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por técnico, OT, SA, descripción..."
          className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
        />
        <Badge>{filtered.length} registros</Badge>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Inicio</th>
              <th className="px-4 py-3 text-left">Fin</th>
              <th className="px-4 py-3 text-left">Horas</th>
              <th className="px-4 py-3 text-left">Técnico</th>
              <th className="px-4 py-3 text-left">Supervisor</th>
              <th className="px-4 py-3 text-left">Recurso</th>
              <th className="px-4 py-3 text-left">OT</th>
              <th className="px-4 py-3 text-left">Imagen</th>
              {user.role === "admin" && <th className="px-4 py-3 text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-500">No hay registros</td></tr>
            ) : (
              filtered.map((w) => {
                const hrs = calcHours(w.startDatetime, w.endDatetime);
                return (
                  <tr key={w.id} className="bg-slate-900 hover:bg-slate-800 transition">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-mono text-xs">{fmtDt(w.startDatetime)}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-mono text-xs">{fmtDt(w.endDatetime)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={hrs > 0 ? "success" : "danger"}>{hrs}h</Badge>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{w.technician}</td>
                    <td className="px-4 py-3 text-slate-300">{w.supervisor}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{w.resource}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{w.workOrder || "—"}</td>
                    <td className="px-4 py-3">
                      {w.authImage ? (
                        <button onClick={() => setImgModal(w.authImage)}
                          className="text-teal-400 hover:text-teal-300 text-xs underline">
                          Ver
                        </button>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    {user.role === "admin" && (
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1.5">
                          <Btn variant="ghost" size="sm" onClick={() => onEdit(w)}>✏</Btn>
                          <Btn variant="danger" size="sm" onClick={() => onDelete(w.id)}>✕</Btn>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {imgModal && (
        <Modal title="Imagen de autorización" onClose={() => setImgModal(null)} size="md">
          <img src={imgModal} alt="Autorización" className="w-full rounded-lg" />
        </Modal>
      )}
    </div>
  );
}

// ─── CRUD Panel ────────────────────────────────────────────────────────────
function CrudPanel({ title, items, fields, onAdd, onEdit, onDelete, icon }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErr, setFormErr] = useState({});

  const openAdd = () => { setEditing(null); setFormData({}); setFormErr({}); setShowForm(true); };
  const openEdit = (item) => { setEditing(item); setFormData({ ...item }); setFormErr({}); setShowForm(true); };
  const close = () => setShowForm(false);

  const handleSave = () => {
    const errs = {};
    fields.forEach((f) => {
      if (f.required && !formData[f.key]?.toString().trim()) errs[f.key] = "Campo obligatorio";
    });
    // Duplicate check
    const dupField = fields.find((f) => f.unique);
    if (dupField && formData[dupField.key]) {
      const dup = items.find(
        (i) => i[dupField.key]?.toLowerCase() === formData[dupField.key]?.toLowerCase() && i.id !== editing?.id
      );
      if (dup) errs[dupField.key] = "Ya existe un registro con este valor";
    }
    if (Object.keys(errs).length) { setFormErr(errs); return; }
    if (editing) onEdit({ ...editing, ...formData });
    else onAdd(formData);
    close();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-slate-500 text-xs">{items.length} registros</p>
          </div>
        </div>
        <Btn variant="primary" size="sm" onClick={openAdd}>+ Agregar</Btn>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              {fields.map((f) => <th key={f.key} className="px-4 py-3 text-left">{f.label}</th>)}
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.length === 0 ? (
              <tr><td colSpan={fields.length + 2} className="px-4 py-6 text-center text-slate-500">Sin registros</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="bg-slate-900 hover:bg-slate-800 transition">
                  {fields.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-slate-300 font-mono text-sm">{item[f.key]}</td>
                  ))}
                  <td className="px-4 py-3">
                    <Badge variant={item.active ? "success" : "default"}>{item.active ? "Activo" : "Inactivo"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1.5">
                      <Btn variant="ghost" size="sm" onClick={() => openEdit(item)}>✏ Editar</Btn>
                      <Btn variant="danger" size="sm" onClick={() => onDelete(item.id)}>✕</Btn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? `Editar ${title}` : `Nuevo ${title}`} onClose={close}>
          <div className="space-y-4">
            {fields.map((f) => (
              <Input
                key={f.key}
                label={f.label}
                required={f.required}
                type={f.type || "text"}
                value={formData[f.key] || ""}
                onChange={(e) => {
                  const v = f.upper ? e.target.value.toUpperCase() : e.target.value;
                  setFormData((p) => ({ ...p, [f.key]: v }));
                  setFormErr((p) => ({ ...p, [f.key]: null }));
                }}
                error={formErr[f.key]}
                placeholder={f.placeholder}
              />
            ))}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active-toggle"
                checked={formData.active !== false}
                onChange={(e) => setFormData((p) => ({ ...p, active: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="active-toggle" className="text-slate-300 text-sm">Activo</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={close}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave}>{editing ? "Guardar" : "Crear"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Admin View ────────────────────────────────────────────────────────────
function AdminView({ supervisors, setSupervisors, resources, setResources, technicians, setTechnicians }) {
  const [tab, setTab] = useState("supervisors");

  const addSupervisor = (d) => setSupervisors((p) => [...p, { ...d, id: nextId(p), active: d.active !== false }]);
  const editSupervisor = (d) => setSupervisors((p) => p.map((s) => s.id === d.id ? d : s));
  const delSupervisor = (id) => setSupervisors((p) => p.filter((s) => s.id !== id));

  const addResource = (d) => setResources((p) => [...p, { ...d, id: nextId(p), active: d.active !== false }]);
  const editResource = (d) => setResources((p) => p.map((r) => r.id === d.id ? d : r));
  const delResource = (id) => setResources((p) => p.filter((r) => r.id !== id));

  const addTech = (d) => setTechnicians((p) => [...p, { ...d, id: nextId(p), active: d.active !== false }]);
  const editTech = (d) => setTechnicians((p) => p.map((t) => t.id === d.id ? d : t));
  const delTech = (id) => setTechnicians((p) => p.filter((t) => t.id !== id));

  const tabs = [
    { id: "supervisors", label: "Supervisores", icon: "👷" },
    { id: "resources", label: "Recursos", icon: "🔧" },
    { id: "technicians", label: "Técnicos", icon: "👤" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-800 pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === t.id
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === "supervisors" && (
        <CrudPanel
          title="Supervisores" icon="👷" items={supervisors}
          fields={[{ key: "name", label: "Nombre completo", required: true, unique: true, upper: true, placeholder: "NOMBRE APELLIDO" }]}
          onAdd={addSupervisor} onEdit={editSupervisor} onDelete={delSupervisor}
        />
      )}
      {tab === "resources" && (
        <CrudPanel
          title="Recursos" icon="🔧" items={resources}
          fields={[
            { key: "number", label: "Número de recurso", required: true, unique: true, placeholder: "REC-001" },
            { key: "description", label: "Descripción", required: true, placeholder: "Descripción del recurso" },
          ]}
          onAdd={addResource} onEdit={editResource} onDelete={delResource}
        />
      )}
      {tab === "technicians" && (
        <CrudPanel
          title="Técnicos" icon="👤" items={technicians}
          fields={[{ key: "name", label: "Nombre del técnico", required: true, unique: true, upper: true, placeholder: "NOMBRE APELLIDO" }]}
          onAdd={addTech} onEdit={editTech} onDelete={delTech}
        />
      )}
    </div>
  );
}

// ─── Reports View ──────────────────────────────────────────────────────────
function ReportsView({ works }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tech, setTech] = useState("");

  const filtered = works.filter((w) => {
    const dt = new Date(w.startDatetime);
    if (from && dt < new Date(from)) return false;
    if (to && dt > new Date(to + "T23:59")) return false;
    if (tech && !w.technician.includes(tech.toUpperCase())) return false;
    return true;
  });

  const totalHrs = filtered.reduce((acc, w) => acc + (calcHours(w.startDatetime, w.endDatetime) || 0), 0);
  const uniqueTechs = [...new Set(filtered.map((w) => w.technician))].length;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest">Filtros</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input label="Técnico" type="text" value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Nombre del técnico..." />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div>
              <p className="text-slate-500 text-xs">Registros</p>
              <p className="text-white font-bold text-lg">{filtered.length}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Horas totales</p>
              <p className="text-amber-400 font-bold text-lg">{Math.round(totalHrs * 10) / 10}h</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Técnicos</p>
              <p className="text-teal-400 font-bold text-lg">{uniqueTechs}</p>
            </div>
          </div>
          <Btn variant="teal" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
            ⬇ Exportar CSV/Excel
          </Btn>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-slate-400 uppercase tracking-wider">
              {["Fecha inicio", "Fecha fin", "Hrs", "Técnico", "Ayudante", "Supervisor", "Recurso", "SA", "OT", "Descripción"]
                .map((h) => <th key={h} className="px-3 py-3 text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-500">Sin registros para los filtros seleccionados</td></tr>
            ) : (
              filtered.map((w) => (
                <tr key={w.id} className="bg-slate-900 hover:bg-slate-800 transition">
                  <td className="px-3 py-2.5 text-slate-300 font-mono whitespace-nowrap">{fmtDt(w.startDatetime)}</td>
                  <td className="px-3 py-2.5 text-slate-300 font-mono whitespace-nowrap">{fmtDt(w.endDatetime)}</td>
                  <td className="px-3 py-2.5"><Badge variant="success">{calcHours(w.startDatetime, w.endDatetime)}h</Badge></td>
                  <td className="px-3 py-2.5 text-white font-medium">{w.technician}</td>
                  <td className="px-3 py-2.5 text-slate-400">{w.assistant || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-300">{w.supervisor}</td>
                  <td className="px-3 py-2.5"><Badge variant="info">{w.resource}</Badge></td>
                  <td className="px-3 py-2.5 text-slate-400 font-mono">{w.sa || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-400 font-mono">{w.workOrder || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-400 max-w-xs truncate" title={w.description}>{w.description || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("works");
  const [supervisors, setSupervisors] = useState(INITIAL_SUPERVISORS);
  const [resources, setResources] = useState(INITIAL_RESOURCES);
  const [technicians, setTechnicians] = useState(INITIAL_TECHNICIANS);
  const [works, setWorks] = useState(INITIAL_WORKS);
  const [editWork, setEditWork] = useState(null);

  const handleLogin = (u) => {
    setUser(u);
    setView(u.role === "admin" ? "list" : "works");
  };
  const handleLogout = () => { setUser(null); setView("works"); };

  const addWork = (data) => setWorks((p) => [...p, { ...data, id: nextId(p) }]);
  const editWorkSave = (data) => { setWorks((p) => p.map((w) => w.id === data.id ? data : w)); setEditWork(null); setView("list"); };
  const deleteWork = (id) => { if (window.confirm("¿Eliminar este registro?")) setWorks((p) => p.filter((w) => w.id !== id)); };

  if (!user) return <LoginView onLogin={handleLogin} />;

  const PAGE_TITLES = {
    works: "Registrar trabajo",
    list: "Lista de trabajos",
    admin: "Administración",
    reports: "Reportes",
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar view={view} setView={(v) => { setView(v); setEditWork(null); }} user={user} onLogout={handleLogout} />
      <main className="flex-1 ml-56 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-slate-950 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-lg">{editWork ? "Editar registro" : PAGE_TITLES[view]}</h2>
              {editWork && (
                <button onClick={() => { setEditWork(null); setView("list"); }}
                  className="text-amber-400 text-xs hover:text-amber-300 transition">
                  ← Volver a la lista
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={user.role === "admin" ? "warning" : "info"}>
                {user.role === "admin" ? "Admin" : "Técnico"}
              </Badge>
              <span className="text-slate-400 text-sm">{user.displayName}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 max-w-5xl mx-auto">
          {(view === "works" || editWork) && (
            <WorkForm
              supervisors={supervisors}
              resources={resources}
              technicians={technicians}
              works={works}
              onSave={editWork ? editWorkSave : addWork}
              editWork={editWork}
            />
          )}
          {view === "list" && !editWork && (
            <WorksList
              works={works}
              onDelete={deleteWork}
              onEdit={(w) => { setEditWork(w); }}
              user={user}
            />
          )}
          {view === "admin" && user.role === "admin" && !editWork && (
            <AdminView
              supervisors={supervisors} setSupervisors={setSupervisors}
              resources={resources} setResources={setResources}
              technicians={technicians} setTechnicians={setTechnicians}
            />
          )}
          {view === "reports" && user.role === "admin" && !editWork && (
            <ReportsView works={works} />
          )}

          {/* Footer crédito */}
          <div className="mt-10 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-600">
            <span>TechPay — Gestión de pagos por hora</span>
            <span className="flex items-center gap-3">
              <span>Desarrollado por <span className="text-slate-500 font-medium">Tobías Vázquez</span></span>
              <a href="tel:+595983993060" className="text-amber-600 hover:text-amber-500 font-mono transition">
                +595 983 993 060
              </a>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
