param(
    [string]$ApiBaseUrl = 'http://localhost:5158/api',
    [string]$Email = 'admin@nutrivida.local',
    [Parameter(Mandatory = $true)]
    [string]$Password
)

$ErrorActionPreference = 'Stop'
function ConvertTo-Utf8Body([string]$json) {
    return ,([System.Text.Encoding]::UTF8.GetBytes($json))
}
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/auth/login" -ContentType 'application/json' -Body (ConvertTo-Utf8Body $loginBody)
$headers = @{ Authorization = "Bearer $($login.accessToken)" }

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$document = "QA-$stamp"
$patientBody = @{
    documentNumber = $document
    firstName = 'Paciente'
    lastName = "Prueba Integral $stamp"
    dateOfBirth = '1991-04-18'
    sexAtBirth = 0
    email = "qa.$stamp@example.test"
    phone = '+593990000000'
    occupation = 'Registro sintetico de control de calidad'
    goal = 'Validar el flujo funcional completo; no usar para decisiones clinicas.'
    emailConsent = $true
    whatsAppConsent = $true
} | ConvertTo-Json
$patient = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/patients" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $patientBody)
$patientId = $patient.id

$assessmentBody = @{
    dailyIntake = 'Registro QA: desayuno, almuerzo, merienda y cena. Informacion sintetica.'
    eatingSchedule = '07:00, 13:00, 17:00 y 20:00'
    allergies = 'Ninguna declarada en este registro de prueba'
    intolerances = 'Ninguna declarada en este registro de prueba'
    sleepHours = 7.5
    sleepQuality = 'Buena'
    exerciseType = 'Caminata moderada de prueba'
    exerciseMinutesPerWeek = 150
    exerciseSchedule = 'Lunes a viernes, 30 minutos'
    hasConstipation = $false
    bristolStoolType = 4
    bowelFrequency = 'Una vez al dia; dato sintetico'
    clinicalNotes = 'Expediente generado automaticamente para control de calidad. No representa una persona real.'
} | ConvertTo-Json
$invalidAssessment = $assessmentBody | ConvertFrom-Json
$invalidAssessment.bristolStoolType = 8
$invalidBristolRejected = $false
try {
    Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/patients/$patientId/assessments" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body ($invalidAssessment | ConvertTo-Json)) | Out-Null
}
catch {
    $invalidBristolRejected = $_.Exception.Response.StatusCode.value__ -eq 400
}
if (!$invalidBristolRejected) { throw 'La API no rechazo un tipo de Bristol fuera del rango 1 a 7.' }
$assessment = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/patients/$patientId/assessments" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $assessmentBody)

$anthropometryBody = @{
    weightKg = 68.4
    heightCm = 164
    waistCm = 82
    bodyFatPercent = 29
    notes = 'Medicion sintetica para verificacion funcional.'
} | ConvertTo-Json
$anthropometry = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/patients/$patientId/anthropometry" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $anthropometryBody)

$diagnosisBody = @{
    assessmentId = $assessment.id
    problemCode = 'QA-NO-CLINICO'
    problemStatement = 'Enunciado sintetico usado unicamente para comprobar el modulo PES.'
    etiology = 'Datos ficticios de control de calidad.'
    signsAndSymptoms = 'Sin interpretacion clinica; registro automatizado.'
} | ConvertTo-Json
$diagnosis = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/patients/$patientId/diagnoses" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $diagnosisBody)

$energyBody = @{
    patientId = $patientId
    formula = 0
    weightKg = 68.4
    heightCm = 164
    ageYears = 35
    sex = 'Female'
    activityFactor = 1.55
    etaPercent = 0.10
    goalAdjustmentKcal = -250
} | ConvertTo-Json
$energy = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/energy/calculate" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $energyBody)

$weekStart = (Get-Date).Date.AddDays(-(([int](Get-Date).DayOfWeek + 6) % 7)).ToString('yyyy-MM-dd')
$followUpBody = @{
    weekStartsOn = $weekStart
    weightKg = 68.1
    exerciseMinutes = 150
    exerciseType = 'Caminata moderada de prueba'
    averageSleepHours = 7.5
    planAdherencePercent = 82
    bristolStoolType = 4
    symptoms = 'Sin sintomas; dato sintetico.'
    professionalNotes = 'Seguimiento QA, no clinico.'
} | ConvertTo-Json
$followUp = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/patients/$patientId/follow-ups" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $followUpBody)

$consultationBody = @{
    patientId = $patientId
    startsAtUtc = (Get-Date).ToUniversalTime().AddHours(2).ToString('o')
    durationMinutes = 45
    reason = 'Atencion sintetica de control de calidad'
} | ConvertTo-Json
$consultation = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/consultations" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $consultationBody)

$foods = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/foods?page=1&pageSize=10" -Headers $headers
$food = $foods.items | Select-Object -First 1
if ($null -eq $food) { throw 'El catalogo no contiene un alimento para probar el menu.' }
$secondFood = $foods.items | Select-Object -Skip 1 -First 1
if ($null -eq $secondFood) { throw 'El catalogo necesita al menos dos alimentos para probar un plato.' }

$dishBody = @{
    name = "Plato QA $stamp"
    mealName = 'Almuerzo'
    servings = 2
    preparationMinutes = 25
    costReferenceDate = (Get-Date).ToString('yyyy-MM-dd')
    instructions = 'Combinar los ingredientes del catalogo y dividir en dos porciones. Preparacion sintetica de control de calidad.'
    costNotes = 'Valores ficticios para verificacion; no usar en consulta.'
    imageUrl = $null
    videoUrl = $null
    ingredients = @(
        @{ foodItemId = $food.id; portions = 2; estimatedCostUsd = 1.20 },
        @{ foodItemId = $secondFood.id; portions = 1; estimatedCostUsd = 0.80 }
    )
} | ConvertTo-Json -Depth 6
$dish = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/dishes" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $dishBody)

$menuBody = @{
    patientId = $patientId
    name = 'Plan QA personalizable'
    startsOn = (Get-Date).ToString('yyyy-MM-dd')
    endsOn = (Get-Date).AddDays(6).ToString('yyyy-MM-dd')
    energyTargetKcal = [decimal]$energy.totalEnergyKcal
    professionalNotes = 'Plantilla sintetica; requiere valoracion y personalizacion profesional.'
    items = @(@{
        foodItemId = $food.id
        dayOfWeek = 1
        mealName = 'Desayuno de prueba'
        foodNameSnapshot = $food.name
        portions = 1
        grams = $food.portionGrams
        energyKcal = $food.energyKcal
        householdMeasure = $food.householdMeasure
    })
} | ConvertTo-Json -Depth 6
try {
    $menu = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/menu-plans" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $menuBody)
}
catch {
    $response = $_.Exception.Response
    if ($null -ne $response) {
        $reader = [System.IO.StreamReader]::new($response.GetResponseStream())
        throw "No se pudo crear el menu: $($reader.ReadToEnd())`nSolicitud: $menuBody"
    }
    throw
}

$report = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/reports/clinical-summary?patientId=$patientId" -Headers $headers
$pdfResponse = Invoke-WebRequest -UseBasicParsing -Method Get -Uri "$ApiBaseUrl/reports/clinical-summary.pdf?patientId=$patientId" -Headers $headers
$pdfValid = $pdfResponse.Headers['Content-Type'] -like 'application/pdf*' -and $pdfResponse.RawContentStream.Length -gt 1000
if (!$pdfValid) { throw 'El reporte PDF no devolvio un documento valido.' }
$messageBody = @{
    patientId = $patientId
    menuPlanId = $menu.id
    channel = 0
    subject = 'Vista previa QA del plan nutricional'
    body = 'Mensaje sintetico preparado para comprobar el modulo. No enviar.'
} | ConvertTo-Json
$message = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/communications/preview" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $messageBody)

$whatsAppBody = @{
    patientId = $patientId
    menuPlanId = $menu.id
    channel = 1
    subject = 'Vista previa QA por WhatsApp'
    body = 'Mensaje sintetico preparado para comprobar el enlace de WhatsApp. No enviar.'
} | ConvertTo-Json
$whatsAppMessage = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/communications/preview" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $whatsAppBody)
if ($whatsAppMessage.actionUrl -notlike 'https://wa.me/*') {
    throw 'El modulo de mensajeria no preparo un enlace valido de WhatsApp.'
}

$patientList = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/patients?q=$document&page=1&pageSize=10" -Headers $headers
$assessmentList = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/patients/$patientId/assessments" -Headers $headers
$followUpList = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/patients/$patientId/follow-ups" -Headers $headers
$menuList = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/menu-plans?patientId=$patientId" -Headers $headers
$messageList = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/communications?patientId=$patientId" -Headers $headers
$templates = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/quick-templates" -Headers $headers
$templateCounts = [ordered]@{}
foreach ($scope in @('assessment', 'followUp', 'menuPlan', 'communication')) {
    $scopedTemplates = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/quick-templates?scope=$scope" -Headers $headers
    $templateCounts[$scope] = @($scopedTemplates).Count
    if ($templateCounts[$scope] -lt 1) { throw "No existen plantillas activas para el modulo $scope." }
}
$invalidTemplateRejected = $false
try {
    $invalidTemplateBody = @{
        name = 'Plantilla QA invalida'
        category = 'Prueba'
        objective = 'Comprobar separacion por modulo'
        summary = 'Solicitud sintetica que debe rechazarse por contener un campo de otro modulo.'
        scope = 'followUp'
        values = @{ subject = 'Campo que pertenece a mensajeria' }
    } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/quick-templates" -Headers $headers -ContentType 'application/json' -Body (ConvertTo-Utf8Body $invalidTemplateBody) | Out-Null
}
catch {
    $invalidTemplateRejected = $_.Exception.Response.StatusCode.value__ -eq 400
}
if (!$invalidTemplateRejected) { throw 'La API no rechazo una plantilla con campos de otro modulo.' }
$dishes = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/dishes?page=1&pageSize=10" -Headers $headers
$audit = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/audit?page=1&pageSize=10" -Headers $headers

[pscustomobject]@{
    status = 'PASS'
    document = $document
    patientId = $patientId
    patientVisible = $patientList.total -eq 1
    invalidBristolRejected = $invalidBristolRejected
    assessments = @($assessmentList).Count
    anthropometryId = $anthropometry.id
    diagnosisId = $diagnosis.id
    energyKcal = $energy.totalEnergyKcal
    followUps = @($followUpList).Count
    consultationId = $consultation.id
    menuPlans = @($menuList).Count
    reportMeasurements = @($report.measurements).Count
    reportFollowUps = @($report.followUps).Count
    pdfValid = $pdfValid
    messageDrafts = @($messageList).Count
    messageMode = $message.mode
    whatsAppLinkPrepared = $whatsAppMessage.actionUrl -like 'https://wa.me/*'
    quickTemplates = @($templates).Count
    quickTemplatesByModule = $templateCounts
    invalidTemplateRejected = $invalidTemplateRejected
    dishes = $dishes.total
    dishId = $dish.id
    auditEvents = $audit.total
} | ConvertTo-Json -Depth 5
