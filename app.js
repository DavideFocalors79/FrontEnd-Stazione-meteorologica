// Mock dashboard app.js
const state = {
  unitTemp: 'C',
  unitWind: 'kmh',
  theme: 'light',
  data: [],
  mockEnabled: false,
}

// DOM refs
const tempEl = document.getElementById('temperature')
const humidityEl = document.getElementById('humidity')
const pressureEl = document.getElementById('pressure')
const windEl = document.getElementById('wind')
const conditionEl = document.getElementById('condition')

// modal
const modal = document.getElementById('modal')
const btnSettings = document.getElementById('btn-settings')
const closeModal = document.getElementById('closeModal')
const saveSettings = document.getElementById('saveSettings')
const unitTempSelect = document.getElementById('unitTemp')
const unitWindSelect = document.getElementById('unitWind')
const themeSelect = document.getElementById('themeSelect')
const btnExport = document.getElementById('btn-export')
const mockCheckbox = document.getElementById('mockData')

btnSettings.addEventListener('click', ()=> modal.classList.remove('hidden'))
closeModal.addEventListener('click', ()=> modal.classList.add('hidden'))
saveSettings.addEventListener('click', ()=>{
  state.unitTemp = unitTempSelect.value
  state.unitWind = unitWindSelect.value
  state.theme = themeSelect.value
  state.mockEnabled = mockCheckbox.checked
  applyTheme()
  modal.classList.add('hidden')
  render()
  // start/stop mock generator based on setting
  if(state.mockEnabled) startMockUpdates()
  else stopMockUpdates()
})

btnExport.addEventListener('click', ()=> exportData())

function applyTheme(){
  if(state.theme === 'dark') document.body.classList.add('dark')
  else document.body.classList.remove('dark')
}

// Mock data generator
function generateMockPoint(date){
  // simple oscillation + randomness
  const baseTemp = 18 + 6*Math.sin(date.getHours()/24*2*Math.PI)
  return {
    ts: date.toISOString(),
    tempC: +(baseTemp + (Math.random()-0.5)*2).toFixed(2),
    humidity: +(50 + (Math.random()-0.5)*20).toFixed(0),
    pressure: +(1013 + (Math.random()-0.5)*8).toFixed(1),
    windKmh: +(5 + Math.abs(Math.random()*15)).toFixed(1),
  }
}

// seed 24 points (hourly)
// seed only when mock is enabled
function seedInitialData(){
  const now = new Date()
  for(let i=23;i>=0;i--){
    const d = new Date(now.getTime() - i*60*60*1000)
    state.data.push(generateMockPoint(d))
  }
}

// Charts
let tempChart, humChart, presChart
let mockIntervalId = null
function createCharts(){
  const tempCtx = document.getElementById('tempChart').getContext('2d')
  tempChart = new Chart(tempCtx, {
    type:'line',
    data:{labels:state.data.map(p=>new Date(p.ts).getHours()+':00'),datasets:[{label:'°C',data:state.data.map(p=>p.tempC),borderColor:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),fill:false}]},
    options:{responsive:true,maintainAspectRatio:false}
  })

  const humCtx = document.getElementById('humChart').getContext('2d')
  humChart = new Chart(humCtx,{type:'bar',data:{labels:state.data.map(p=>new Date(p.ts).getHours()+':00'),datasets:[{label:'Umidità %',data:state.data.map(p=>p.humidity),backgroundColor:'#7eb6ff'},{label:'Precipitazioni mm',data:state.data.map(_=>Math.random()*4),backgroundColor:'#4aa3ff'}]},options:{responsive:true,maintainAspectRatio:false}})

  const presCtx = document.getElementById('presChart').getContext('2d')
  presChart = new Chart(presCtx,{type:'line',data:{labels:state.data.map(p=>new Date(p.ts).getHours()+':00'),datasets:[{label:'hPa',data:state.data.map(p=>p.pressure),borderColor:'#6ab04c',fill:false}]},options:{responsive:true,maintainAspectRatio:false}})
}

function updateCharts(){
  // ensure temperature dataset label matches selected unit
  if(tempChart && tempChart.data && tempChart.data.datasets && tempChart.data.datasets[0]){
    tempChart.data.datasets[0].label = state.unitTemp === 'C' ? '°C' : '°F'
  }
  tempChart.data.datasets[0].data = state.data.map(p=>convertTempForChart(p))
  tempChart.data.labels = state.data.map(p=>new Date(p.ts).getHours()+':00')
  tempChart.update()

  humChart.data.datasets[0].data = state.data.map(p=>p.humidity)
  humChart.data.datasets[1].data = state.data.map(_=>Math.random()*4)
  humChart.update()

  presChart.data.datasets[0].data = state.data.map(p=>p.pressure)
  presChart.update()
}

function convertTempForChart(p){
  return state.unitTemp === 'C' ? p.tempC : +(p.tempC*9/5+32).toFixed(2)
}

function render(){
  // if no data yet, show placeholders and avoid errors
  if(!state.data || state.data.length === 0){
    tempEl.textContent = '--'
    humidityEl.textContent = '--%'
    pressureEl.textContent = '--'
    windEl.textContent = '--'
    conditionEl.textContent = '--'
    if(tempChart) updateCharts()
    return
  }

  const latest = state.data[state.data.length-1]
  const temp = state.unitTemp === 'C' ? latest.tempC : +(latest.tempC*9/5+32).toFixed(1)
  tempEl.textContent = temp + (state.unitTemp === 'C' ? '°C':'°F')
  humidityEl.textContent = latest.humidity + '%'
  pressureEl.textContent = latest.pressure + ' hPa'
  const wind = state.unitWind === 'kmh' ? latest.windKmh : +(latest.windKmh*0.621371).toFixed(1)
  windEl.textContent = wind + (state.unitWind === 'kmh' ? ' km/h':' mph')
  conditionEl.textContent = getCondition(latest.tempC)
  if(tempChart) updateCharts()
}

function getCondition(t){
  if(t>=28) return 'Caldo'
  if(t>=20) return 'Soleggiato'
  if(t>=10) return 'Nuvoloso'
  return 'Fresco'
}

// periodic update (mock receiving new data every 5 seconds)
function startMockUpdates(){
  if(mockIntervalId) return
  // if no data present seed 24 points
  if(state.data.length === 0) seedInitialData()
  // ensure charts and UI reflect seeded data immediately
  if(tempChart) updateCharts()
  render()

  mockIntervalId = setInterval(()=>{
    const now = new Date()
    const point = generateMockPoint(now)
    state.data.push(point)
    if(state.data.length>48) state.data.shift()
    updateCharts()
    render()
  },5000)
}

function stopMockUpdates(){
  if(!mockIntervalId) return
  clearInterval(mockIntervalId)
  mockIntervalId = null
}

// export CSV/JSON
function exportData(){
  const csv = toCSV(state.data)
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'meteo_export.csv'
  a.click()
  URL.revokeObjectURL(url)
}
function toCSV(arr){
  const headers = ['ts','tempC','humidity','pressure','windKmh']
  const rows = arr.map(r=>headers.map(h=>r[h]).join(','))
  return headers.join(',')+"\n"+rows.join('\n')
}

// init
applyTheme()
createCharts()
render()

// keyboard accessibility: Esc closes modal
document.addEventListener('keydown', e=>{ if(e.key==='Escape') modal.classList.add('hidden') })

// initialize controls (mock checkbox)
if(mockCheckbox){
  mockCheckbox.checked = state.mockEnabled
  mockCheckbox.addEventListener('change', ()=>{
    state.mockEnabled = mockCheckbox.checked
    if(state.mockEnabled) startMockUpdates()
    else stopMockUpdates()
  })
}
