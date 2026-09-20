import React, { useState } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import TopBar from '../components/dashboard/TopBar'
import FAIcon from '../components/commons/FAIcon'
import Select from '../components/commons/Select'
import LoadingSpinner from '../components/commons/LoadingSpinner'
import { useInvitation } from '../hooks/auth/useInvitation'
import { ToastProvider, useToast } from '../components/commons/ToastProvider'
import ConfirmModal from '../components/commons/ConfirmModal'
import { PERMISSION_GROUPS } from '../constants/permissions'
import { calculatePayrollDeductions } from '../utils/payroll'
import { EMPLOYEE_TYPE_OPTIONS } from '../constants/employeeTypes'
import useDuiScan from '../hooks/useDuiScan'
import DuiScanStep from '../components/employee/DuiScanStep'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const DAYS = [
  { value: 'lunes', label: 'Lun' },
  { value: 'martes', label: 'Mar' },
  { value: 'miercoles', label: 'Mié' },
  { value: 'jueves', label: 'Jue' },
  { value: 'viernes', label: 'Vie' },
  { value: 'sabado', label: 'Sáb' },
  { value: 'domingo', label: 'Dom' },
]

const ROLE_CONFIG = {
  admin: {
    label: 'Administrador',
    icon: 'shield-alt',
    description: 'Acceso completo a la gestión del sistema',
    steps: [
      {
        title: 'Información básica',
        subtitle: 'Datos de contacto del nuevo administrador',
        fields: ['email', 'name', 'lastname'],
      },
    ],
  },
  employee: {
    label: 'Empleado',
    icon: 'briefcase',
    description: 'Acceso operativo con permisos específicos',
    // Aviso en el botón de selección: quien va a invitar a alguien necesita
    // tener el documento a la mano ANTES de empezar, no a mitad del proceso.
    requirement: 'Debes tener el DUI del empleado a invitar a mano',
    steps: [
      {
        title: 'Información básica',
        subtitle: 'Datos de contacto del nuevo empleado',
        fields: ['email', 'name', 'lastname'],
      },
      {
        title: 'Escanear el DUI',
        subtitle: 'Toma las fotos del documento y el sistema llenará los datos por ti',
        fields: ['duiScan'],
      },
      {
        title: 'Datos del documento',
        subtitle: 'Revisa lo que se leyó del DUI y corrige lo que haga falta',
        fields: ['duiNit', 'birthDate', 'gender', 'maritalStatus', 'address'],
      },
      {
        title: 'Datos personales',
        subtitle: 'Contacto y puesto de trabajo',
        fields: ['phone', 'type'],
      },
      {
        title: 'Información laboral',
        subtitle: 'Salario base. AFP, ISSS y renta se calculan automáticamente',
        fields: ['salary', 'additionalPay', 'workInsurance'],
      },
      {
        title: 'Identificadores y banco',
        subtitle: 'Se pueden dejar vacíos: el expediente quedará marcado como incompleto',
        fields: ['isssNumber', 'afpInstitution', 'afpNumber', 'bankName', 'bankAccount'],
      },
      {
        title: 'Documentos del expediente',
        subtitle: 'Comprobante de domicilio y antecedentes penales (opcionales)',
        fields: ['extraDocuments'],
      },
      {
        title: 'Horario de trabajo',
        subtitle: 'Días y horas en que atiende este empleado (opcional, se puede definir después)',
        fields: ['workDays', 'scheduleStart', 'scheduleEnd'],
      },
      {
        title: 'Permisos del sistema',
        subtitle: 'A qué pantallas y funciones podrá acceder (opcional, se puede definir después)',
        fields: ['permissions'],
      },
    ],
  },
}

const INITIAL_FORM_DATA = {
  email: '',
  name: '',
  lastname: '',
  phone: '',
  duiNit: '',
  address: '',
  type: '',
  salary: '',
  additionalPay: '',
  additionalPayDuration: '',
  workInsurance: false,
  workDays: [],
  scheduleStart: '',
  scheduleEnd: '',
  permissions: [],
  // Datos que salen del DUI escaneado (el admin los revisa y corrige)
  birthDate: '',
  gender: '',
  maritalStatus: '',
  // Identificadores de ley: pueden quedar vacíos, el expediente queda
  // marcado como incompleto hasta que alguien los complete
  isssNumber: '',
  afpInstitution: '',
  afpNumber: '',
  bankName: '',
  bankAccount: '',
}

// Cuánto dura un pago adicional. Un bono se pacta por un tiempo definido,
// no para siempre.
const ADDITIONAL_PAY_DURATIONS = [
  { value: '15d', label: '15 días' },
  { value: '1m', label: '1 mes' },
  { value: '2m', label: '2 meses' },
  { value: '3m', label: '3 meses' },
]

const AFP_INSTITUTIONS = [
  { value: 'confia', label: 'AFP Confía' },
  { value: 'crecer', label: 'AFP Crecer' },
  { value: 'ipsfa', label: 'IPSFA' },
  { value: 'inpep', label: 'INPEP' },
]

const GENDER_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
]

const MARITAL_STATUS_OPTIONS = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'divorciado', label: 'Divorciado/a' },
  { value: 'viudo', label: 'Viudo/a' },
  { value: 'acompanado', label: 'Acompañado/a' },
]

// Estilo base para los inputs clay
const inputClasses =
  'w-full px-4 py-2.5 bg-surfalt border border-line rounded-none focus:outline-none focus:ring-2 focus:ring-acline focus:border-acline transition-all text-inkalt placeholder:text-muted text-sm'

// Sube el comprobante de domicilio y los antecedentes al mismo lugar donde
// quedaron las fotos del DUI, y devuelve sus URLs para adjuntarlas a la
// invitación.
const uploadExtraDocuments = async ({ proofOfAddress, criminalRecord }) => {
  try {
    const body = new FormData()
    if (proofOfAddress) body.append('proofOfAddress', proofOfAddress)
    if (criminalRecord) body.append('criminalRecord', criminalRecord)

    const res = await fetch(`${API_URL}/users/dui-scan/documents`, {
      method: 'POST',
      credentials: 'include',
      body,
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { success: false, error: data.message }

    return { success: true, documents: data.documents || {} }
  } catch (err) {
    console.error('Error al subir los documentos del expediente:', err)
    return { success: false, error: 'Error de conexión al guardar los documentos.' }
  }
}

// Selector de un documento del expediente. A diferencia del DUI, aquí se
// acepta también PDF: los recibos y las solvencias suelen descargarse así.
const DocumentSlot = ({ label, hint, file, onPick, onClear }) => (
  <div className="flex items-center gap-3 p-3 bg-surface rounded-none border border-line">
    <div className="w-10 h-10 rounded-full bg-acsoft flex items-center justify-center shrink-0">
      <FAIcon icon={file ? 'file-circle-check' : 'file-arrow-up'} className="text-ac" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-display font-bold text-ink">{label}</p>
      <p className="text-[11px] text-muted truncate">{file ? file.name : hint}</p>
    </div>
    {file ? (
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-ac font-display font-semibold shrink-0"
      >
        Quitar
      </button>
    ) : (
      <label className="px-3 py-1.5 rounded-none bg-surfalt text-xs font-display font-semibold text-inkalt cursor-pointer hover:bg-surfalt transition-colors shrink-0">
        Elegir
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => onPick(e.target.files?.[0] || null)}
          className="hidden"
        />
      </label>
    )}
  </div>
)

function InviteStaffContent() {
  const [step, setStep] = useState(1) // 1: elegir rol, 2: formulario, 3: éxito
  const [subStep, setSubStep] = useState(0) // índice del paso actual
  const [role, setRole] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { loading, error, sendInvitation, reset } = useInvitation()
  const { addToast } = useToast()
  // Cuando el DUI se lee con éxito, sus datos pasan al formulario y la
  // pantalla avanza sola al paso de revisión: el admin no tiene que volver
  // a pulsar nada para ver lo que se extrajo.
  const duiScan = useDuiScan({
    onExtracted: (d) => {
      setFormData((prev) => ({
        ...prev,
        // Solo se pisa lo que el documento sí trajo: si un campo no se pudo
        // leer, se conserva lo que el admin ya hubiera escrito.
        ...(d.duiNumber ? { duiNit: d.duiNumber } : {}),
        ...(d.names ? { name: d.names } : {}),
        ...(d.lastNames ? { lastname: d.lastNames } : {}),
        ...(d.birthDate ? { birthDate: d.birthDate } : {}),
        ...(d.gender ? { gender: d.gender } : {}),
        ...(d.maritalStatus ? { maritalStatus: d.maritalStatus } : {}),
        ...(d.address ? { address: d.address } : {}),
      }))

      // Avanza del paso de escaneo al de revisión de los datos leídos.
      setSubStep((prev) => (ROLE_CONFIG.employee.steps[prev]?.fields?.includes('duiScan') ? prev + 1 : prev))
    },
  })

  // Comprobante de domicilio y antecedentes penales: se suben junto con la
  // invitación, no antes, porque son opcionales.
  const [extraDocs, setExtraDocs] = useState({ proofOfAddress: null, criminalRecord: null })
  const [uploadingDocs, setUploadingDocs] = useState(false)

  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [validationErrors, setValidationErrors] = useState({})
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (validationErrors[name]) setValidationErrors((prev) => ({ ...prev, [name]: null }))
  }

  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day) ? prev.workDays.filter((d) => d !== day) : [...prev.workDays, day],
    }))
  }

  const togglePermission = (id) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(id) ? prev.permissions.filter((p) => p !== id) : [...prev.permissions, id],
    }))
  }

  // Validación específica para los campos del sub‑paso actual
  const validateFields = (fields) => {
    const errors = {}
    if (fields.includes('email')) {
      if (!formData.email.trim()) errors.email = 'El correo electrónico es requerido'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Correo electrónico inválido'
    }
    if (fields.includes('name') && !formData.name.trim()) errors.name = 'El nombre es requerido'
    if (fields.includes('lastname') && !formData.lastname.trim()) errors.lastname = 'El apellido es requerido'
    if (fields.includes('phone') && !formData.phone.trim()) errors.phone = 'El teléfono es requerido'
    if (fields.includes('duiNit') && !formData.duiNit.trim()) errors.duiNit = 'El DUI/NIT es requerido'
    if (fields.includes('address') && !formData.address.trim()) errors.address = 'La dirección es requerida'
    if (fields.includes('type') && !formData.type) errors.type = 'El puesto es requerido'
    if (fields.includes('salary')) {
      if (!formData.salary) errors.salary = 'El salario es requerido'
      else if (isNaN(formData.salary)) errors.salary = 'El salario debe ser un número'
    }
    if (fields.includes('additionalPay') && formData.additionalPay) {
      if (isNaN(formData.additionalPay)) errors.additionalPay = 'El pago adicional debe ser un número'
      // Un bono sin plazo no se puede liquidar después: si se puso monto,
      // hay que decir hasta cuándo.
      else if (Number(formData.additionalPay) > 0 && !formData.additionalPayDuration) {
        errors.additionalPayDuration = 'Indica por cuánto tiempo se dará el pago adicional'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const currentStepsConfig = role ? ROLE_CONFIG[role].steps : []
  const isLastSubStep = subStep === currentStepsConfig.length - 1

  const handleNext = async () => {
    const currentFields = currentStepsConfig[subStep].fields
    if (!validateFields(currentFields)) return

    if (!isLastSubStep) {
      setSubStep((prev) => prev + 1)
      return
    }

    // Armar payload y enviar invitación
    const data = {
      email: formData.email.trim(),
      name: formData.name.trim(),
      lastname: formData.lastname.trim(),
    }

    // Los documentos del expediente se guardan primero (la invitación viaja
    // como JSON, así que solo puede llevar URLs, no archivos).
    let uploadedDocs = {}
    if (role === 'employee' && (extraDocs.proofOfAddress || extraDocs.criminalRecord)) {
      setUploadingDocs(true)
      const uploaded = await uploadExtraDocuments(extraDocs)
      setUploadingDocs(false)

      if (!uploaded.success) {
        addToast(uploaded.error || 'No se pudieron guardar los documentos', 'error')
        return
      }
      uploadedDocs = uploaded.documents
    }

    if (role === 'employee') {
      Object.assign(data, {
        phone: formData.phone.trim(),
        duiNit: formData.duiNit.trim(),
        address: formData.address.trim(),
        type: formData.type,
        salary: Number(formData.salary),
        additionalPay: formData.additionalPay ? Number(formData.additionalPay) : 0,
        // La duración solo tiene sentido si de verdad hay un bono
        additionalPayDuration: formData.additionalPay ? (formData.additionalPayDuration || null) : null,
        workInsurance: formData.workInsurance,
        workDays: formData.workDays,
        scheduleStart: formData.scheduleStart || null,
        scheduleEnd: formData.scheduleEnd || null,
        permissions: formData.permissions,
        // Datos que salieron del DUI (ya revisados por el admin)
        birthDate: formData.birthDate || null,
        gender: formData.gender || null,
        maritalStatus: formData.maritalStatus || null,
        // Identificadores de ley: pueden ir vacíos a propósito
        isssNumber: formData.isssNumber.trim() || null,
        afpInstitution: formData.afpInstitution || null,
        afpNumber: formData.afpNumber.trim() || null,
        bankName: formData.bankName.trim() || null,
        bankAccount: formData.bankAccount.trim() || null,
        // Fotos del DUI (del escaneo) + documentos del expediente
        documents: { ...(duiScan.documents || {}), ...uploadedDocs },
      })
    }

    const result = await sendInvitation(role, data)
    if (result.success) {
      setStep(3)
      addToast('Invitación enviada correctamente', 'success')
    } else {
      addToast(error || 'Error al enviar la invitación', 'error')
    }
  }

  const handleBack = () => {
    if (subStep > 0) {
      setSubStep((prev) => prev - 1)
      return
    }
    setRole(null)
    setStep(1)
    reset()
    duiScan.reset()
    setExtraDocs({ proofOfAddress: null, criminalRecord: null })
  }

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole)
    setStep(2)
    setSubStep(0)
    reset()
    duiScan.reset()
    setExtraDocs({ proofOfAddress: null, criminalRecord: null })
  }

  const handleInviteAnother = () => {
    setFormData(INITIAL_FORM_DATA)
    setValidationErrors({})
    setRole(null)
    setSubStep(0)
    setStep(1)
    reset()
    // El siguiente empleado tiene su propio DUI y sus propios documentos
    duiScan.reset()
    setExtraDocs({ proofOfAddress: null, criminalRecord: null })
  }

  // El admin confirmó que quiere descartar el registro en curso: se limpia
  // todo y se vuelve a la selección de rol, igual que "Invitar a otra persona"
  const handleCancelConfirmed = () => {
    setConfirmCancelOpen(false)
    handleInviteAnother()
  }

  // Renderizado de la selección de rol
  const renderRoleSelection = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Object.entries(ROLE_CONFIG).map(([key, config]) => (
        <button
          key={key}
          type="button"
          onClick={() => handleSelectRole(key)}
          className="flex items-center gap-4 p-5 bg-surface rounded-none border border-line
            hover:scale-[1.01] transition-all text-left"
        >
          <div className="w-12 h-12 bg-acsoft rounded-full flex items-center justify-center flex-shrink-0"
          >
            <FAIcon icon={config.icon} className="text-ac text-xl" />
          </div>
          <div>
            <p className="font-display font-bold text-ink">{config.label}</p>
            <p className="text-xs text-muted">{config.description}</p>
            {/* Aviso de lo que hay que tener listo antes de empezar */}
            {config.requirement && (
              <p className="text-[11px] text-warn font-display font-semibold mt-1.5 inline-flex items-start gap-1">
                <FAIcon icon="id-card" size="xs" className="mt-0.5 shrink-0" />
                {config.requirement}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  )

  const renderProgressDots = () => {
    if (currentStepsConfig.length <= 1) return null
    return (
      <div className="flex items-center justify-center gap-2 mb-5">
        {currentStepsConfig.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === subStep ? 'w-8 bg-ac' : idx < subStep ? 'w-4 bg-acsoft' : 'w-4 bg-line'
            }`}
          />
        ))}
      </div>
    )
  }

  // Renderiza un campo según su nombre
  const renderField = (fieldName) => {
    switch (fieldName) {
      case 'email':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Correo electrónico <span className="text-ac">*</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder={`${ROLE_CONFIG[role].label.toLowerCase()}@syscor.com`}
              value={formData.email}
              onChange={handleChange}
              className={inputClasses}
            />
            {validationErrors.email && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.email}</p>}
          </div>
        )
      case 'name':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Nombres <span className="text-ac">*</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="Ej. David Eduardo"
              value={formData.name}
              onChange={handleChange}
              className={inputClasses}
            />
            {validationErrors.name && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.name}</p>}
          </div>
        )
      case 'lastname':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Apellidos <span className="text-ac">*</span>
            </label>
            <input
              type="text"
              name="lastname"
              placeholder="Ej. Pérez García"
              value={formData.lastname}
              onChange={handleChange}
              className={inputClasses}
            />
            {validationErrors.lastname && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.lastname}</p>}
          </div>
        )
      case 'phone':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Teléfono <span className="text-ac">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="Ej. 1234-5678"
              value={formData.phone}
              onChange={handleChange}
              className={inputClasses}
            />
            {validationErrors.phone && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.phone}</p>}
          </div>
        )
      case 'duiNit':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              DUI/NIT <span className="text-ac">*</span>
            </label>
            <input
              type="text"
              name="duiNit"
              placeholder="Ej. 12345678-9"
              value={formData.duiNit}
              onChange={handleChange}
              className={inputClasses}
            />
            {validationErrors.duiNit && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.duiNit}</p>}
          </div>
        )
      case 'address':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Dirección <span className="text-ac">*</span>
            </label>
            <input
              type="text"
              name="address"
              placeholder="Ej. Calle Principal #123"
              value={formData.address}
              onChange={handleChange}
              className={inputClasses}
            />
            {validationErrors.address && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.address}</p>}
          </div>
        )
      case 'type':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Puesto <span className="text-ac">*</span>
            </label>
            <Select
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="">Selecciona un puesto</option>
              {EMPLOYEE_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
            {validationErrors.type && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.type}</p>}
          </div>
        )
      case 'salary': {
        const breakdown = calculatePayrollDeductions(formData.salary)
        return (
          <div key={fieldName} className="mb-3 sm:col-span-2">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Salario Base <span className="text-ac">*</span>
            </label>
            <input
              type="number"
              name="salary"
              placeholder="Ej. 1500.00"
              value={formData.salary}
              onChange={handleChange}
              className={`${inputClasses} sm:max-w-xs`}
            />
            {validationErrors.salary && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.salary}</p>}

            {breakdown.grossSalary > 0 && (
              <div className="mt-3 bg-surface rounded-none border border-line p-3 sm:max-w-sm">
                <p className="text-[11px] font-display font-bold text-muted uppercase tracking-wider mb-2">
                  Descuentos de ley (calculados automáticamente)
                </p>
                <div className="space-y-1 text-xs text-inkalt">
                  <div className="flex justify-between"><span>Salario bruto</span><span className="font-medium text-ink">${breakdown.grossSalary.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>AFP (7.25%)</span><span className="text-ac">-${breakdown.afp.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>ISSS (3%, tope $30)</span><span className="text-ac">-${breakdown.isss.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Renta (ISR)</span><span className="text-ac">-${breakdown.isr.toFixed(2)}</span></div>
                  <div className="flex justify-between pt-1.5 mt-1.5 border-t border-line">
                    <span className="font-display font-bold text-ink">Salario neto</span>
                    <span className="font-display font-bold text-ok">${breakdown.netSalary.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      }
      case 'additionalPay':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Pago Adicional <span className="text-muted normal-case tracking-normal font-medium">(opcional)</span>
            </label>
            <input
              type="number"
              name="additionalPay"
              placeholder="Ej. 100.00"
              value={formData.additionalPay}
              onChange={handleChange}
              className={inputClasses}
            />
            <p className="text-[11px] text-muted mt-1">
              Es un bono aparte del salario: no se le descuenta AFP, ISSS ni renta.
            </p>
            {validationErrors.additionalPay && <p className="text-ac text-xs mt-1 font-medium">{validationErrors.additionalPay}</p>}

            {/* Un bono se pacta por un tiempo definido, así que solo se
                pregunta la duración cuando de verdad hay un monto. */}
            {formData.additionalPay && Number(formData.additionalPay) > 0 && (
              <div className="mt-3">
                <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
                  ¿Por cuánto tiempo? <span className="text-ac">*</span>
                </label>
                <Select
                  name="additionalPayDuration"
                  value={formData.additionalPayDuration}
                  onChange={handleChange}
                >
                  <option value="">Selecciona la duración</option>
                  {ADDITIONAL_PAY_DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </Select>
                {validationErrors.additionalPayDuration && (
                  <p className="text-ac text-xs mt-1 font-medium">{validationErrors.additionalPayDuration}</p>
                )}
              </div>
            )}
          </div>
        )
      case 'workInsurance':
        return (
          <label
            key={fieldName}
            className="flex items-center gap-2 mb-3 p-3 bg-surface rounded-none border border-line cursor-pointer transition-shadow"
          >
            <input
              type="checkbox"
              name="workInsurance"
              checked={formData.workInsurance}
              onChange={handleChange}
              className="w-4 h-4 accent-red-500 rounded"
            />
            <span className="text-sm text-inkalt font-medium">Cuenta con seguro de trabajo</span>
          </label>
        )
      case 'workDays':
        return (
          <div key={fieldName} className="mb-3 sm:col-span-2">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Días que trabaja
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`px-3 py-1.5 rounded-none text-xs font-display font-semibold border transition-colors ${
                    formData.workDays.includes(d.value)
                      ? 'bg-ac text-white border-ac'
                      : 'bg-surface text-muted border-line hover:border-acline'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )
      case 'scheduleStart':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Hora de entrada
            </label>
            <input type="time" name="scheduleStart" value={formData.scheduleStart} onChange={handleChange} className={inputClasses} />
          </div>
        )
      case 'scheduleEnd':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Hora de salida
            </label>
            <input type="time" name="scheduleEnd" value={formData.scheduleEnd} onChange={handleChange} className={inputClasses} />
          </div>
        )
      // --- Escaneo del DUI ---
      case 'duiScan':
        return (
          <div key={fieldName} className="mb-3 sm:col-span-2">
            <DuiScanStep
              {...duiScan}
              onSkip={() => setSubStep((prev) => prev + 1)}
            />
          </div>
        )

      // --- Datos que salieron del documento (editables) ---
      case 'birthDate':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>
        )
      case 'gender':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Sexo
            </label>
            <Select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="">Sin especificar</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </Select>
          </div>
        )
      case 'maritalStatus':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Estado familiar
            </label>
            <Select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
              <option value="">Sin especificar</option>
              {MARITAL_STATUS_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
        )

      // --- Identificadores de ley y banco (pueden quedar vacíos) ---
      case 'isssNumber':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Número de ISSS
            </label>
            <input
              type="text"
              name="isssNumber"
              placeholder="Ej. 123456789"
              value={formData.isssNumber}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>
        )
      case 'afpInstitution':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Institución de AFP
            </label>
            <Select name="afpInstitution" value={formData.afpInstitution} onChange={handleChange}>
              <option value="">Sin especificar</option>
              {AFP_INSTITUTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </Select>
          </div>
        )
      case 'afpNumber':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Número de AFP
            </label>
            <input
              type="text"
              name="afpNumber"
              placeholder="Ej. 000123456789"
              value={formData.afpNumber}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>
        )
      case 'bankName':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Banco
            </label>
            <input
              type="text"
              name="bankName"
              placeholder="Ej. Banco Agrícola"
              value={formData.bankName}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>
        )
      case 'bankAccount':
        return (
          <div key={fieldName} className="mb-3">
            <label className="block text-xs font-display font-semibold text-muted uppercase tracking-wider mb-1.5">
              Número de cuenta
            </label>
            <input
              type="text"
              name="bankAccount"
              placeholder="Ej. 1234567890"
              value={formData.bankAccount}
              onChange={handleChange}
              className={inputClasses}
            />
            <p className="text-[11px] text-muted mt-1">
              Es a donde se le depositará la planilla.
            </p>
          </div>
        )

      // --- Documentos sueltos del expediente ---
      case 'extraDocuments':
        return (
          <div key={fieldName} className="mb-3 sm:col-span-2 space-y-3">
            <DocumentSlot
              label="Comprobante de domicilio"
              hint="Recibo de agua o luz a nombre del empleado"
              file={extraDocs.proofOfAddress}
              onPick={(file) => setExtraDocs((prev) => ({ ...prev, proofOfAddress: file }))}
              onClear={() => setExtraDocs((prev) => ({ ...prev, proofOfAddress: null }))}
            />
            <DocumentSlot
              label="Antecedentes penales"
              hint="Solvencia de la Dirección General de Centros Penales"
              file={extraDocs.criminalRecord}
              onPick={(file) => setExtraDocs((prev) => ({ ...prev, criminalRecord: file }))}
              onClear={() => setExtraDocs((prev) => ({ ...prev, criminalRecord: null }))}
            />
            <p className="text-[11px] text-muted">
              Si faltan, el empleado quedará marcado con &ldquo;Atención&rdquo; hasta que se
              agreguen desde su ficha.
            </p>
          </div>
        )

      case 'permissions':
        return (
          <div key={fieldName} className="sm:col-span-2 space-y-4">
            {Object.entries(PERMISSION_GROUPS).map(([groupName, perms]) => (
              <div key={groupName}>
                <h4 className="text-xs font-display font-bold text-muted uppercase tracking-wider mb-2">{groupName}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {perms.map((p) => {
                    const checked = formData.permissions.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePermission(p.id)}
                        className={`flex items-center justify-between gap-2 text-left px-3 py-2 rounded-none border transition-colors ${
                          checked ? 'bg-acsoft border-acline' : 'bg-surface border-line hover:border-line'
                        }`}
                      >
                        <span className={`text-xs font-display font-semibold ${checked ? 'text-ac' : 'text-inkalt'}`}>{p.label}</span>
                        <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${checked ? 'bg-ac border-ac text-white' : 'border-linealt text-transparent'}`}>
                          <FAIcon icon="check" size="xs" />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {formData.permissions.length > 0 && (
              <p className="text-xs text-warn bg-warnsoft border border-warn rounded-none px-3 py-2">
                Este empleado recibirá un código de acceso por correo en cuanto complete su registro, porque tendrá al menos un permiso.
              </p>
            )}
          </div>
        )
      default:
        return null
    }
  }

  const renderForm = () => {
    if (!role) return null
    const config = ROLE_CONFIG[role]
    const currentStep = config.steps[subStep]

    return (
      <form onSubmit={(e) => { e.preventDefault(); handleNext() }} className="space-y-1">
        <div className="mb-4">
          <p className="text-sm font-display font-bold text-ink">{currentStep.title}</p>
          <p className="text-xs text-muted">{currentStep.subtitle}</p>
        </div>

        {renderProgressDots()}

        {error && (
          <div className="mb-4 p-3 bg-acsoft border border-acline rounded-none flex items-start gap-2">
            <FAIcon icon="times-circle" className="text-ac mt-0.5" />
            <p className="text-ac text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {currentStep.fields.map(renderField)}
        </div>

        <div className="flex gap-2 mt-4 max-w-lg">
          <button
            type="button"
            onClick={handleBack}
            disabled={loading || uploadingDocs}
            className="flex-1 flex items-center justify-center gap-1 border border-linealt text-inkalt py-3 rounded-none hover:bg-surfalt transition disabled:opacity-50 font-display font-semibold text-sm"
          >
            <FAIcon icon="chevron-left" /> Volver
          </button>
          <button
            type="button"
            onClick={() => setConfirmCancelOpen(true)}
            disabled={loading || uploadingDocs}
            className="flex-1 flex items-center justify-center gap-1 border border-acline text-ac py-3 rounded-none hover:bg-acsoft transition disabled:opacity-50 font-display font-semibold text-sm"
          >
            <FAIcon icon="xmark" /> Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || uploadingDocs}
            className="flex-[1.4] bg-ac hover:bg-ac text-white font-display font-semibold py-3 rounded-none transition disabled:opacity-50 flex items-center justify-center text-sm"
          >
            {loading || uploadingDocs ? <LoadingSpinner color="white" size="sm" /> : isLastSubStep ? 'Enviar invitación' : 'Continuar'}
          </button>
        </div>
      </form>
    )
  }

  const renderSuccess = () => (
    <div className="text-center space-y-4 max-w-md mx-auto">
      <div className="flex justify-center">
        <FAIcon icon="check-circle" className="text-ok text-6xl" />
      </div>
      <div className="p-3 bg-oksoft border border-ok rounded-none">
        <p className="text-ok text-sm font-medium">
          Invitación enviada correctamente a <strong>{formData.email}</strong>
        </p>
      </div>
      <p className="text-muted text-xs">
        El {ROLE_CONFIG[role].label.toLowerCase()} recibirá un enlace para completar su registro.
      </p>
      <button
        type="button"
        onClick={handleInviteAnother}
        className="w-full mt-2 bg-ac hover:bg-ac text-white font-display font-semibold py-3 rounded-none transition"
      >
        Invitar a otra persona
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surfalt">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar activeMenu="invite-staff" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink mb-1">Invitar Staff</h1>
              <p className="text-sm sm:text-base text-inkalt">
                {step === 1 && 'Elige a quién quieres invitar al sistema'}
                {step === 2 && `Datos del nuevo ${ROLE_CONFIG[role]?.label.toLowerCase() || ''}`}
                {step === 3 && 'Invitación enviada'}
              </p>
            </div>

            <div className="bg-surface rounded-none border border-line p-6 sm:p-8">
              {step === 1 && renderRoleSelection()}
              {step === 2 && renderForm()}
              {step === 3 && renderSuccess()}
            </div>
          </div>
        </main>
      </div>

      <ConfirmModal
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancelConfirmed}
        title="Cancelar registro"
        message="¿Estás seguro de que quieres cancelar? Se perderá toda la información que has ingresado."
        confirmText="Sí, cancelar"
        cancelText="Seguir editando"
        icon="triangle-exclamation"
        variant="danger"
      />
    </div>
  )
}

export default function InviteStaff() {
  return (
    <ToastProvider>
      <InviteStaffContent />
    </ToastProvider>
  )
}
