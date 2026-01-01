// Supabase Edge Function: Update NPC Airlines
// Run daily via cron to update NPC airline stats based on player activity

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Static NPC Airline Data (average flights per day from real-world stats)
const NPC_AIRLINES = [
  {
    code: 'VLHA',
    name: 'Virtual Lufthansa',
    realIcao: 'DLH',
    realName: 'Lufthansa',
    avgFlightsPerDay: 1200,
    avgDistancePerFlight: 850, // NM average
    icon: 'plane',
    color: '#FFD700'
  },
  {
    code: 'VBAW',
    name: 'Virtual British Airways',
    realIcao: 'BAW',
    realName: 'British Airways',
    avgFlightsPerDay: 800,
    avgDistancePerFlight: 1200,
    icon: 'crown',
    color: '#1E3A8A'
  },
  {
    code: 'VAFR',
    name: 'Virtual Air France',
    realIcao: 'AFR',
    realName: 'Air France',
    avgFlightsPerDay: 900,
    avgDistancePerFlight: 950,
    icon: 'globe',
    color: '#002157'
  },
  {
    code: 'VEMR',
    name: 'Virtual Emirates',
    realIcao: 'UAE',
    realName: 'Emirates',
    avgFlightsPerDay: 400,
    avgDistancePerFlight: 3500,
    icon: 'star',
    color: '#C8102E'
  },
  {
    code: 'VUAL',
    name: 'Virtual United',
    realIcao: 'UAL',
    realName: 'United Airlines',
    avgFlightsPerDay: 1500,
    avgDistancePerFlight: 900,
    icon: 'shield',
    color: '#0033A0'
  },
  {
    code: 'VAAL',
    name: 'Virtual American',
    realIcao: 'AAL',
    realName: 'American Airlines',
    avgFlightsPerDay: 1800,
    avgDistancePerFlight: 850,
    icon: 'eagle',
    color: '#0078D2'
  },
  {
    code: 'VDAL',
    name: 'Virtual Delta',
    realIcao: 'DAL',
    realName: 'Delta Air Lines',
    avgFlightsPerDay: 1600,
    avgDistancePerFlight: 920,
    icon: 'turbine',
    color: '#C8102E'
  },
  {
    code: 'VSNG',
    name: 'Virtual Singapore',
    realIcao: 'SIA',
    realName: 'Singapore Airlines',
    avgFlightsPerDay: 350,
    avgDistancePerFlight: 4200,
    icon: 'diamond',
    color: '#F7B500'
  },
  {
    code: 'VQTR',
    name: 'Virtual Qatar',
    realIcao: 'QTR',
    realName: 'Qatar Airways',
    avgFlightsPerDay: 450,
    avgDistancePerFlight: 3800,
    icon: 'fire',
    color: '#5C0632'
  },
  {
    code: 'VKLM',
    name: 'Virtual KLM',
    realIcao: 'KLM',
    realName: 'KLM Royal Dutch',
    avgFlightsPerDay: 600,
    avgDistancePerFlight: 1100,
    icon: 'jet',
    color: '#00A1E4'
  }
]

Deno.serve(async (req) => {
  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get total player flights for scaling
    const { count: playerFlightCount } = await supabase
      .from('flights')
      .select('*', { count: 'exact', head: true })

    const totalPlayerFlights = playerFlightCount || 0
    console.log(`Total player flights: ${totalPlayerFlights}`)

    // 2. Process each NPC airline
    const results = []

    for (const npc of NPC_AIRLINES) {
      // Check if airline exists
      const { data: existing } = await supabase
        .from('airlines')
        .select('id')
        .eq('code', npc.code)
        .single()

      let airlineId: string

      if (!existing) {
        // Create new NPC airline
        const { data: newAirline, error: createError } = await supabase
          .from('airlines')
          .insert({
            name: npc.name,
            code: npc.code,
            icon: npc.icon,
            color: npc.color,
            is_npc: true,
            real_airline_icao: npc.realIcao,
            real_airline_name: npc.realName,
            member_count: 0
          })
          .select('id')
          .single()

        if (createError) {
          console.error(`Error creating ${npc.code}:`, createError)
          continue
        }
        airlineId = newAirline.id
        console.log(`Created NPC airline: ${npc.name}`)
      } else {
        airlineId = existing.id
      }

      // 3. Calculate scaled stats
      const rawFlights = npc.avgFlightsPerDay
      const rawDistance = rawFlights * npc.avgDistancePerFlight

      // Scale factor: NPC gets at most as many flights as players have total
      let scaleFactor = 0
      if (rawFlights > 0 && totalPlayerFlights > 0) {
        scaleFactor = Math.min(1.0, totalPlayerFlights / rawFlights)
      }

      const scaledFlights = Math.floor(rawFlights * scaleFactor)
      const scaledDistance = Math.floor(rawDistance * scaleFactor)

      // Score calculation (similar to player formula)
      // Score = Distance + (Flights * 30 average landing bonus)
      const scaledScore = Math.floor(scaledDistance + (scaledFlights * 30))
      const scaledFlightTime = scaledFlights * 7200 // 2h average per flight

      // 4. Update airline stats
      const { error: updateError } = await supabase
        .from('airlines')
        .update({
          raw_flight_count: rawFlights,
          total_flights: scaledFlights,
          total_distance: scaledDistance,
          total_score: scaledScore,
          total_flight_time: scaledFlightTime,
          last_api_update: new Date().toISOString()
        })
        .eq('id', airlineId)

      if (updateError) {
        console.error(`Error updating ${npc.code}:`, updateError)
      } else {
        results.push({
          airline: npc.code,
          rawFlights,
          scaledFlights,
          scaleFactor: scaleFactor.toFixed(4),
          scaledScore
        })
        console.log(`Updated ${npc.code}: ${scaledFlights} flights (scale: ${scaleFactor.toFixed(4)})`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        playerFlights: totalPlayerFlights,
        airlines: results
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
