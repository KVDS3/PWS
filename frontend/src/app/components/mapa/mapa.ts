declare var google: any;

import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.html',
  styleUrls: ['./mapa.css']
})
export class Mapa implements OnInit, AfterViewInit {
  map: any;
  markerSucursal: any;
  markerUsuario: any;
  autocomplete: any;
  service: any;

  // Coordenadas de tu sucursal
  sucursal = { lat: 21.167352184787585, lng: -100.93100934652857 };

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!(window as any).google) {
      console.error('Google Maps no está cargado');
      return;
    }

    // Inicializar mapa centrado en la sucursal
    const mapOptions: any = {
      center: this.sucursal,
      zoom: 15
    };
    this.map = new google.maps.Map(
      document.getElementById('map'),
      mapOptions
    );

    // Marcador fijo de la sucursal
    this.markerSucursal = new google.maps.Marker({
      position: this.sucursal,
      map: this.map,
      title: 'Sucursal'
    });

    // Geolocalización del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.ngZone.run(() => {
            const userPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };

            this.markerUsuario = new google.maps.Marker({
              position: userPos,
              map: this.map,
              title: 'Tu ubicación',
              icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });

            // Opcional: centrar el mapa en el usuario
            // this.map.setCenter(userPos);
          });
        },
        (error) => console.warn('Error geolocalizando', error)
      );
    }

    // Autocomplete para búsqueda de lugares
    const input = document.getElementById('autocomplete') as HTMLInputElement;
    this.autocomplete = new google.maps.places.Autocomplete(input);
    this.autocomplete.bindTo('bounds', this.map);

    this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = this.autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        // Centrar mapa y agregar marcador del lugar seleccionado
        this.map.setCenter(place.geometry.location);
        this.map.setZoom(17);

        if (this.markerUsuario) this.markerUsuario.setMap(null);
        this.markerUsuario = new google.maps.Marker({
          map: this.map,
          position: place.geometry.location,
          title: place.name
        });
      });
    });

    // PlacesService (opcional)
    this.service = new google.maps.places.PlacesService(this.map);
  }
}
