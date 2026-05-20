import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const getGroupedStates = () =>
  api.get('/api/states/grouped').then(r => r.data)

export const getCountries = () =>
  api.get('/api/countries').then(r => r.data)

export const getAirborneByCountry = country =>
  api.get('/api/states/airborne', { params: { country } }).then(r => r.data)

export const getAirports = (q, country) =>
  api.get('/api/airports', { params: { q, country } }).then(r => r.data)

export const getDepartures = airport =>
  api.get('/api/departures', { params: { airport } }).then(r => r.data)

export const getAircraftPosition = icao24 =>
  api.get(`/api/aircraft/${icao24}`).then(r => r.data)
