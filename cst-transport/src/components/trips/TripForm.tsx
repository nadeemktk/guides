import React, { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import type { Trip, Vehicle, Driver, Client } from '../../types'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  trip: Trip | null
  vehicles: Vehicle[]
  drivers: Driver[]
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}

export default function TripForm({ trip, vehicles, drivers, clients, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    trip_date:        trip?.trip_date        || new Date().toISOString().split('T')[0],
    client_id:        trip?.client_id        || '',
    client_name:      trip?.client_name      || '',
    client_mobile:    trip?.client_mobile    || '',
    job_description:  trip?.job_description  || '',
    vehicle_id:       trip?.vehicle_id       || '',
    vehicle_type:     trip?.vehicle_type     || '',
    seats:            trip?.seats            || '',
    driver_id:        trip?.driver_id        || '',
    driver_name:      trip?.driver_name      || '',
    driver_mobile:    trip?.driver_mobile    || '',
    owner_name:       trip?.owner_name       || '',
    pickup_location:  trip?.pickup_location  || '',
    dropoff_location: trip?.dropoff_location || '',
    trip_type:        trip?.trip_type        || 'one_way',
    start_time:       trip?.start_time       || '',
    end_time:         trip?.end_time         || '',
    payment_amount:   trip?.payment_amount   || '',
    payment_status:   trip?.payment_status   || 'unpaid',
    payment_method:   trip?.payment_method   || 'cash',
    partial_amount:   trip?.partial_amount   || '',
    booked_by:        trip?.booked_by        || user?.full_name || '',
    received_by:      trip?.received_by      || '',
    remarks:          trip?.remarks          || ''
  })
  const [saving, setSaving] = useState(false)

  // Only show Daily Trip clients in the trip client selector
  const dailyTripClients = clients.filter(c => c.client_type === 'daily_trip')

  useEffect(() => {
    if (form.client_id) {
      const c = clients.find(x => x.id === form.client_id)
      if (c) setForm(p => ({ ...p, client_name: c.company_name, client_mobile: c.mobile || '' }))
    }
  }, [form.client_id])

  useEffect(() => {
    if (form.vehicle_id) {
      const v = vehicles.find(x => x.id === form.vehicle_id)
      if (v) setForm(p => ({ ...p, vehicle_type: v.vehicle_type, seats: v.seats || '', owner_name: v.owner_name || '' }))
    }
  }, [form.vehicle_id])

  useEffect(() => {
    if (form.driver_id) {
      const d = drivers.find(x => x.id === form.driver_id)
      if (d) setForm(p => ({ ...p, driver_name: d.full_name, driver_mobile: d.mobile || '' }))
    }
  }, [form.driver_id])

  const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }))

  const handleSave = async () => {
    if (!form.client_name || !form.job_description) {
      alert('Client name and job description are required')
      return
    }
    setSaving(true)
    const payload = { ...form, payment_amount: parseFloat(String(form.payment_amount)) || 0, seats: parseInt(String(form.seats)) || 0, partial_amount: parseFloat(String(form.partial_amount)) || 0, created_by: user?.id }
    if (trip) {
      await window.api.updateTrip({ id: trip.id, ...payload })
    } else {
      await window.api.createTrip(payload)
    }
    setSaving(false)
    onSaved()
  }

  const F = (key: string, label: string, type = 'text', opts?: any) => (
    <div className="form-group">
      <label className="label">{label}</label>
      {opts?.options ? (
        <select className="select" value={(form as any)[key]} onChange={e => set(key, e.target.value)}>
          {opts.options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input className="input" type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={opts?.placeholder} />
      )}
    </div>
  )

  return (
    <Modal
      title={trip ? 'Edit Trip' : 'New Trip Entry'}
      onClose={onClose}
      size="2xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : trip ? 'Update Trip' : 'Save Trip'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Date & Trip Type */}
        <div className="grid grid-cols-3 gap-4">
          {F('trip_date', 'Trip Date *', 'date')}
          {F('trip_type', 'Trip Type', 'text', { options: [
            { value: 'one_way', label: 'One Way' },
            { value: 'round_trip', label: 'Round Trip' },
            { value: 'daily_hire', label: 'Daily Hire' },
            { value: 'monthly', label: 'Monthly' }
          ]})}
          {F('start_time', 'Start Time', 'time')}
        </div>

        {/* Client */}
        <div className="border-t border-slate-700 pt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Client Details</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Daily Trip Client</label>
              <select className="select" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                <option value="">-- Walk-in / Manual --</option>
                {dailyTripClients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
              {dailyTripClients.length === 0 && (
                <p className="text-[10px] text-amber-400 mt-1">No daily trip clients yet. Add them in the Clients module.</p>
              )}
            </div>
            {F('client_name', 'Client Name *', 'text', { placeholder: 'Company or individual name' })}
            {F('client_mobile', 'Client Mobile', 'text', { placeholder: '+971...' })}
          </div>
          {F('job_description', 'Job Description *', 'text', { placeholder: 'Describe the transport job...' })}
          <div className="grid grid-cols-2 gap-4 mt-3">
            {F('pickup_location', 'Pickup Location', 'text', { placeholder: 'From...' })}
            {F('dropoff_location', 'Drop-off Location', 'text', { placeholder: 'To...' })}
          </div>
        </div>

        {/* Vehicle */}
        <div className="border-t border-slate-700 pt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Vehicle & Driver</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Vehicle</label>
              <select className="select" value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
                <option value="">-- Select Vehicle --</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} – {v.vehicle_type} ({v.seats}s)</option>)}
              </select>
            </div>
            {F('vehicle_type', 'Vehicle Type', 'text', { placeholder: 'Bus, Van, Car...' })}
            {F('seats', 'No. of Seats', 'number', { placeholder: '0' })}
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div className="form-group">
              <label className="label">Driver</label>
              <select className="select" value={form.driver_id} onChange={e => set('driver_id', e.target.value)}>
                <option value="">-- Select Driver --</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            {F('driver_name', 'Driver Name', 'text')}
            {F('driver_mobile', 'Driver Mobile', 'text')}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            {F('owner_name', 'Vehicle Owner', 'text')}
            {F('booked_by', 'Booked By', 'text')}
          </div>
        </div>

        {/* Payment */}
        <div className="border-t border-slate-700 pt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment Details</div>
          <div className="grid grid-cols-3 gap-4">
            {F('payment_amount', 'Payment Amount *', 'number', { placeholder: '0.00' })}
            {F('payment_status', 'Payment Status', 'text', { options: [
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'paid', label: 'Paid' },
              { value: 'partial', label: 'Partial' }
            ]})}
            {F('payment_method', 'Payment Method', 'text', { options: [
              { value: 'cash', label: 'Cash' },
              { value: 'bank', label: 'Bank Transfer' },
              { value: 'online', label: 'Online' },
              { value: 'other', label: 'Other' }
            ]})}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            {form.payment_status === 'partial' && F('partial_amount', 'Partial Amount Paid', 'number')}
            {F('received_by', 'Received By', 'text', { placeholder: 'Staff name' })}
          </div>
          <div className="form-group mt-3">
            <label className="label">Remarks / Notes</label>
            <textarea className="input resize-none" rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Any additional notes..." />
          </div>
        </div>
      </div>
    </Modal>
  )
}
