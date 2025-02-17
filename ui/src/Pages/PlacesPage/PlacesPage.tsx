import { gql, useQuery } from '@apollo/client'
import type mapboxgl from 'mapbox-gl'
import React, { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import Layout from '../../Layout'
import { makeUpdateMarkers } from './mapboxHelperFunctions'
import MapPresentMarker from './MapPresentMarker'

// Will be bundled to dist/src/Pages/PlacesPage/PlacesPage.css
import 'mapbox-gl/dist/mapbox-gl.css'

const MapWrapper = styled.div`
  width: 100%;
  height: calc(100% - 24px);
`

const MapContainer = styled.div`
  width: 100%;
  height: 100%;
`

const MAPBOX_DATA_QUERY = gql`
  query placePageMapboxToken {
    mapboxToken
    myMediaGeoJson
  }
`

export type PresentMarker = {
  id: number
  cluster: boolean
}

const MapPage = () => {
  const { t } = useTranslation()

  const [mapboxLibrary, setMapboxLibrary] = useState<typeof mapboxgl | null>()
  const [presentMarker, setPresentMarker] = useState<PresentMarker | null>(null)
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  const { data: mapboxData } = useQuery(MAPBOX_DATA_QUERY)

  useEffect(() => {
    async function loadMapboxLibrary() {
      const mapbox = (await import('mapbox-gl')).default

      setMapboxLibrary(mapbox)
    }
    loadMapboxLibrary()
  }, [])

  useEffect(() => {
    if (
      mapboxLibrary == null ||
      mapContainer.current == null ||
      mapboxData == null ||
      map.current != null
    ) {
      return
    }

    mapboxLibrary.accessToken = mapboxData.mapboxToken

    map.current = new mapboxLibrary.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      zoom: 1,
    })

    // Add map navigation control
    map.current.addControl(new mapboxLibrary.NavigationControl())

    map.current.on('load', () => {
      if (map.current == null) {
        console.error('ERROR: map is null')
        return
      }

      map.current.addSource('media', {
        type: 'geojson',
        data: mapboxData.myMediaGeoJson,
        cluster: true,
        clusterRadius: 50,
        clusterProperties: {
          thumbnail: ['coalesce', ['get', 'thumbnail'], false],
        },
      })

      // Add dummy layer for features to be queryable
      map.current.addLayer({
        id: 'media-points',
        type: 'circle',
        source: 'media',
        filter: ['!', true],
      })

      const updateMarkers = makeUpdateMarkers({
        map: map.current,
        mapboxLibrary,
        setPresentMarker,
      })

      map.current.on('move', updateMarkers)
      map.current.on('moveend', updateMarkers)
      map.current.on('sourcedata', updateMarkers)
      updateMarkers()
    })
  }, [mapContainer, mapboxLibrary, mapboxData])

  if (mapboxData && mapboxData.mapboxToken == null) {
    return (
      <Layout title={t('places_page.title', 'Places')}>
        <h1>Mapbox token is not set</h1>
        <p>
          To use map related features a mapbox token is needed.
          <br /> A mapbox token can be created for free at{' '}
          <a href="https://account.mapbox.com/access-tokens/">mapbox.com</a>.
        </p>
        <p>
          Make sure the access token is added as the MAPBOX_TOKEN environment
          variable.
        </p>
      </Layout>
    )
  }

  return (
    <Layout title="Places">
      <Helmet>
        <link rel="stylesheet" href="/src/Pages/PlacesPage/PlacesPage.css" />
      </Helmet>
      <MapWrapper>
        <MapContainer ref={mapContainer}></MapContainer>
      </MapWrapper>
      <MapPresentMarker
        map={map.current}
        presentMarker={presentMarker}
        setPresentMarker={setPresentMarker}
      />
    </Layout>
  )
}

export default MapPage
