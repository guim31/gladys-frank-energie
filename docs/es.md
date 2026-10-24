# Frank Energie

Los precios dinámicos de la electricidad y del gas de [Frank Energie](https://www.frankenergie.nl),
el proveedor neerlandés, en Gladys: el precio de la hora actual, las horas más
baratas del día, un gráfico de precios de hoy y de mañana, y disparadores de escena
para poner en marcha sus aparatos cuando la electricidad es más barata.

Esta integración no tiene relación con Frank Energie. Lee los precios públicos de
Frank Energie, probada con la API real, pero se ha desarrollado sin contrato de
Frank Energie: sus comentarios son bienvenidos.

## Presentación

Frank Energie publica, sin cuenta ni clave:

- los **precios horarios de la electricidad** del mercado diario neerlandés (EPEX,
  zona NL), como precio de mercado o como precio final que paga por kWh un cliente
  de Frank Energie (precio de mercado, recargo de compra e impuesto sobre la
  energía), con o sin IVA;
- el **precio del gas** del día gasista, válido de 06:00 a 06:00, de la misma forma.

Los precios de mañana se publican entre las 13:00 y las 15:00. El precio final es el
precio por unidad: no incluye los costes fijos mensuales ni la reducción anual de
impuestos de su contrato.

Su **cuenta de Frank Energie** (precios personalizados, consumo, costes, carga
inteligente) no se usa: esta versión solo lee los precios públicos.

Todas las horas se indican en hora de Ámsterdam, y un día va de medianoche a
medianoche en Ámsterdam, sea cual sea la zona horaria de su Gladys.

## Requisitos

- Gladys Assistant 5.1.0 o posterior.
- Acceso a internet desde Gladys hacia `graphql.frankenergie.nl`.
- Nada más: ni cuenta, ni clave de API, ni hardware.

## Instalación

1. En Gladys, abra **Integraciones → Instalar desde GitHub** e introduzca
   `https://github.com/guim31/gladys-frank-energie`.
2. Abra la integración, compruebe la configuración y guarde.
3. Abra la pestaña **Descubrir** y añada el dispositivo **Frank Energie**.
4. En un panel, añada el widget **Precios de la luz**.

## Configuración

| Campo                                  | Por defecto  | Función                                                                        |
| -------------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| Precio de la electricidad              | Precio final | Precio final por unidad, o solo el precio de mercado EPEX day-ahead            |
| Incluir el IVA                         | Sí           | Precios con el IVA neerlandés (21 %)                                           |
| Precio del gas                         | Sí           | Mostrar también el precio del gas del día; cambiarlo añade o quita una función |
| Idioma de los nombres de las funciones | Francés      | Se usa al añadir el dispositivo: los nombres ya no cambian después             |

El botón **Consultar los precios ahora** consulta Frank Energie en el momento y muestra
lo que publica para hoy y mañana: útil para comprobar la conexión.

## El dispositivo Frank Energie

Un único dispositivo, de solo lectura, actualizado por la propia integración cada
minuto (los precios se consultan en Frank Energie una vez por hora).

| Función                           | Tipo     | Valor                                                                         |
| --------------------------------- | -------- | ----------------------------------------------------------------------------- |
| Precio actual (€/kWh)             | Precio   | Precio de la hora actual                                                      |
| Precio próxima hora (€/kWh)       | Precio   | Precio de la hora siguiente (después de las 23:00, cuando se conoce mañana)   |
| Precio medio de hoy (€/kWh)       | Precio   | Media de las horas del día                                                    |
| Precio mínimo de hoy (€/kWh)      | Precio   | Hora más barata del día                                                       |
| Precio máximo de hoy (€/kWh)      | Precio   | Hora más cara del día                                                         |
| Hora más barata de hoy            | Texto    | Inicio de la hora más barata, `HH:MM`                                         |
| Hora más cara de hoy              | Texto    | Inicio de la hora más cara, `HH:MM`                                           |
| Rango de la hora (1 = más barata) | Contador | Rango de la hora actual en el día, de 1 a 24 (23 o 25 en los cambios de hora) |
| Precio del gas de hoy (€/m³)      | Precio   | Precio del gas del día gasista (06:00 a 06:00), si está activado              |

Gladys no tiene unidad €/kWh: los precios aparecen en euros y el nombre dice por qué
unidad. Cuando una función es la única de su tipo en el dispositivo, el panel muestra
la etiqueta genérica del tipo («Contador») en lugar de su nombre.

## Widget del panel

**Precios de la luz** muestra el tipo de precio, tres mosaicos (ahora, próxima hora,
media de hoy), el gráfico de hoy y de mañana con la hora más barata y la más cara de
cada día marcadas y una línea en la hora actual, y después la hora más barata de hoy
y de mañana, la media de mañana y el precio del gas. Mientras no se publiquen los
precios de mañana, indica que llegan después de las 15:00.

## Disparadores de escena

Dos disparadores, en el editor de escenas bajo **Frank Energie**. Ambos se refieren a
la electricidad y a las horas del día en curso (de medianoche a medianoche).

### Empiezan las horas más baratas del día

Se dispara una vez al día, al inicio del tramo de horas consecutivas más barato del
día. Elija la duración del tramo: de 1 a 6 u 8 horas (1 hora es la hora más barata
del día). Variables: precio medio del tramo, hora de inicio y de fin.

### Empieza una de las horas más baratas

Se dispara al inicio de cada una de las N horas más baratas del día, consecutivas o
no. Elija N: de 1 a 6, 8, 10 o 12. Variables: precio de la hora, su rango, hora de
inicio y de fin.

Los disparadores salen cuando empieza la hora, con un máximo de 10 minutos de retraso
(reinicio de Gladys o de la integración): una hora que empezó hace más tiempo no
dispara nada. «El precio baja de X» no es un disparador: use la función **Precio
actual** con la condición de umbral del editor de escenas.

## Ejemplos de escenas

- **Lavavajillas en las 3 horas más baratas**: disparador _Empiezan las horas más
  baratas del día_, 3 horas → encender el enchufe del lavavajillas.
- **Termo eléctrico en las 4 horas más baratas**: disparador _Empieza una de las
  horas más baratas_, 4 → encender el termo; una segunda escena sobre _Rango de la
  hora_ mayor que 4 → apagarlo.
- **Precio negativo**: cuando _Precio actual_ (precio de mercado) baja de 0 →
  encender el termo y enviar el mensaje «La electricidad es gratis ahora mismo».

## Actualización y uso de la API

Frank Energie no publica ninguna cuota para esta API pública. La integración la usa
poco:

- dos peticiones por hora, una para hoy y otra para mañana, cada una con los precios
  de la electricidad y del gas del día;
- a partir de las 13:00, ambas de nuevo cada 15 minutos hasta que se publican los
  precios de mañana, y después de nuevo una vez por hora;
- tras un fallo, nuevo intento a los 5, 10, 20, 40 y después 60 minutos; mientras
  tanto se siguen usando los últimos precios conocidos (los precios se conocen con un
  día de antelación).

Los estados solo se publican cuando cambian, con un recordatorio cada 6 horas.

## Solución de problemas

- **«No se puede acceder a Frank Energie»** en la pantalla de configuración: Gladys
  no tiene acceso a internet o Frank Energie tiene una incidencia. Se siguen usando los
  últimos precios conocidos; pulse **Consultar los precios ahora** para reintentar.
- **«no publica ningún precio de la electricidad para hoy»**: Frank Energie
  respondió sin precios para el día, lo que ocurre en una incidencia de publicación. La
  integración lo vuelve a intentar cada hora.
- **Ningún valor en el dispositivo**: añada primero el dispositivo desde la pestaña
  Descubrir; sus valores llegan en el acto.
- **Falta la función del gas o sigue apareciendo**: tras cambiar el ajuste del gas,
  abra la pestaña Descubrir y pulse **Actualizar** en el dispositivo.
- **Registros detallados**: defina `LOG_LEVEL=debug` en el contenedor para ver cada
  consulta.

## Limitaciones

- Precios horarios. El mercado diario neerlandés negocia cuartos de hora desde
  octubre de 2025, y Frank Energie puede publicarlos: esta versión muestra los
  precios horarios (la media de los cuatro cuartos de hora).
- Solo los precios públicos: sin inicio de sesión, por lo tanto sin precios
  personalizados, consumo, costes ni carga inteligente.
- El precio final sin IVA se calcula a partir de los componentes que publica Frank
  Energie, con el IVA neerlandés del 21 %.
- Los disparadores solo miran el día en curso: un tramo más barato nunca pasa de
  medianoche.
- Solo lectura: la integración no controla nada por sí misma.
- Los nombres de las funciones se fijan al añadir el dispositivo; cambiar el idioma
  después no los renombra.

## Comparación con EnergyZero

Esta integración sigue la [integración EnergyZero](https://github.com/guim31/gladys-energyzero)
del mismo autor: mismo dispositivo, mismo widget, mismos disparadores, de modo que una
escena puede pasar de una a otra. Ambas leen el mismo mercado diario neerlandés; los
precios finales difieren por el recargo de cada proveedor. Elija la de su proveedor.
