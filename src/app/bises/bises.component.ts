import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { LocalDataService } from '../services/local-data.service';
import { Router } from '@angular/router';
import { BlizzardApiService } from '../services/blizzard-api.service';
import { forkJoin, Observable } from 'rxjs';
import { RaidbotsApiService } from '../services/raidbots-api.service';

@Component({
  selector: 'app-bises',
  templateUrl: './bises.component.html',
  styleUrls: ['./bises.component.css']
})
export class BisesComponent implements OnInit {

  PH_image2 = 'https://wow.zamimg.com/images/wow/icons/large/inv_10_jewelcrafting_gem3primal_fire_cut_blue.jpg';
  PH_image0 = 'https://wow.zamimg.com/images/wow/icons/large/inv_10_jewelcrafting_gem3primal_fire_cut_bronze.jpg';
  PH_image3 = 'https://wow.zamimg.com/images/wow/icons/large/inv_10_jewelcrafting_gem3primal_fire_cut_green.jpg';
  PH_image1 = 'https://wow.zamimg.com/images/wow/icons/large/inv_10_jewelcrafting_gem3primal_fire_cut_red.jpg';
  allBisList: any = [];
  tableBisList: any = [];
  instances: any = [];
  itemList: any = [];
  itemList_full: any = [];

  constructor(
    private http: HttpClient,
    private LocalDataService: LocalDataService,
    private RaidbotsApiService: RaidbotsApiService,
    private blizzardService: BlizzardApiService,
    private router: Router) {
  }

  ngOnInit(): void {
    this.getBisListData().then(() => {
      // Después de que getBisListData haya terminado, llama a getBosses()
      this.getBosses();
    }).catch((error) => {
      console.error("Hubo un error al cargar la bis list:", error);
    });
  }

  getBisListData() {
    return new Promise<void>((resolve, reject) => {
      this.LocalDataService.getBisListTxt().subscribe({
        next: (data) => {
          var array = data.split(/\r?\n/);
          array = this.splitArrayByEmpty(array);
          this.allBisList = [];

          // Procesamos los elementos y los agregamos a allBisList
          array.forEach((element: any) => {
            var elementArray = [this.limpiarSpec(element[0])];
            element.forEach((item: any) => {
              if (typeof item === 'number' || !isNaN(Number(item))) {
                elementArray.push(item);
              }
            });
            this.allBisList.push(elementArray);
          });

          // Limpiamos la tabla antes de generar los nuevos ítems
          this.tableBisList = [];

          // Ahora, usamos Promise.all para esperar a que todas las llamadas a generateTable terminen
          Promise.all(this.allBisList.map((classBis: any) => this.generateTable(classBis)))
            .then(() => {
              console.log('Todos los ítems han sido procesados');
              resolve(); // Resolvemos la promesa cuando todos los ítems hayan sido agregados
            })
            .catch((err) => {
              console.error('Error al generar la tabla:', err);
              reject(err); // Rechazamos la promesa en caso de error
            });
        },
        error: (err) => {
          console.error('Error al obtener el archivo BisList:', err);
          reject(err); // Rechazamos la promesa si hay un error en la suscripción
        }
      });
    });
  }

  splitArrayByEmpty(arr: any) {
    const result = []; // Array que contendrá los grupos
    let currentGroup = []; // Grupo actual que estamos construyendo

    for (const item of arr) {
      if (item === '') {
        // Si encontramos un elemento vacío, añadimos el grupo actual al resultado
        if (currentGroup.length > 0) {
          result.push(currentGroup);
          currentGroup = []; // Reiniciar el grupo actual
        }
      } else {
        // Si no es un elemento vacío, lo añadimos al grupo actual
        currentGroup.push(item);
      }
    }

    // Añadir el último grupo si existe
    if (currentGroup.length > 0) {
      result.push(currentGroup);
    }

    return result;
  }

  limpiarSpec(str: string): string {
    const words = str.split(" "); // Divide la cadena en palabras
    const lastWord = words.pop(); // Extrae la última palabra

    if (lastWord) {
      words.unshift(lastWord); // Coloca la última palabra al principio
    }

    // Si hay más de 2 palabras, cambiar los espacios a guiones entre las palabras restantes
    if (words.length > 1) {
      return [words[0], words.slice(1).join("-")].join(" "); // Únelo con guiones y coloca la última palabra al principio
    }

    return words.join(" "); // Si es solo una palabra, devuélvela tal cual
  }

  capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  generateTable(bisList: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      var spec = bisList[0];

      let observables: Observable<any>[] = bisList.slice(1).map((element: any) => {
        return new Observable((observer) => {
          // Llamada para obtener la imagen del ítem
          this.getImgLink(element).then((imageUrl: any) => {
            // Llamada para obtener el nombre del ítem
            this.getItemName(element).then((itemName: any) => {
              var item = {
                id: element,
                spec: [spec],
                img: imageUrl,
                name: itemName,
              };

              // Comprobar si ya existe un ítem con el mismo id en tableBisList
              const existingItem = this.tableBisList.find((existingItem: { id: any; }) => existingItem.id === item.id);

              if (!existingItem) {
                this.tableBisList.push(item);
              } else {
                existingItem.spec.push(spec);
              }

              observer.next(item);
              observer.complete();
            }).catch((err) => {
              console.error('Error al obtener el nombre del ítem', err);
              observer.complete();
            });
          }).catch((err) => {
            console.error('Error al obtener la imagen del ítem', err);
            observer.complete();
          });
        });
      });

      // Usamos forkJoin para esperar a que todos los observables se resuelvan
      forkJoin(observables).subscribe({
        next: (items) => {
          resolve(); // Resolver la promesa cuando todos los ítems hayan sido procesados
        },
        error: (err) => {
          console.error('Error en la llamada de forkJoin:', err);
          reject(err); // Rechazar la promesa si hay un error
        }
      });
    });
  }



  getImgLink(id: any): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.blizzardService.getItemMedia(id).subscribe(
        (response) => {
          var imageUrl = response.assets.find((asset: any) => asset.key === 'icon')?.value || null;
          resolve(imageUrl);
        },
        (error) => {
          console.error('Error fetching item media', error);
          reject(error);
        }
      );
    });
  }

  getItemName(id: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.blizzardService.getItemName(id).subscribe(
        (name) => {
          resolve(name);
        },
        (error) => {
          console.error('Error fetching item name', error);
          reject(error);
        }
      );
    });
  }

  sumarArrays(arrays: any): number[] {
    // Usamos reduce para combinar todos los arrays en uno solo
    return arrays.reduce((resultado: any, array: any) => {
      // Excluimos el primer elemento de cada array usando slice(1)
      const arraySinPrimerElemento = array.slice(1);

      // Sumamos los elementos restantes del array al resultado
      return resultado.concat(arraySinPrimerElemento);
    }, []);
  }

  generateColor(spec: any) {
    if (spec == 'Devastation Evoker' || spec == 'Augmentation Evoker' || spec == 'Preservation Evoker') {
      return '#33937f';
    }
    if (spec == 'Balance Druid' || spec == 'Feral Druid' || spec == 'Guardian Druid' || spec == 'Restoration Druid') {
      return '#ff7d0a';
    }
    if (spec == 'Unholy Death-Knight' || spec == 'Frost Death-Knight' || spec == 'Blood Death-Knight') {
      return '#c41f3b';
    }
    if (spec == 'Havoc Demon-Hunter' || spec == 'Vengeance Demon-Hunter') {
      return '#a330c9';
    }
    if (spec == 'Mastery Hunter-Beast' || spec == 'Marksmanship Hunter' || spec == 'Survival Hunter') {
      return '#abd473';
    }
    if (spec == 'Enhancement Shaman' || spec == 'Elemental Shaman' || spec == 'Restoration Shaman') {
      return '#0070de';
    }
    if (spec == 'Assassination Rogue' || spec == 'Outlaw Rogue' || spec == 'Subtlety Rogue') {
      return '#fff569';
    }
    if (spec == 'Arcane Mage' || spec == 'Frost Mage' || spec == 'Fire Mage') {
      return '#69ccf0';
    }
    if (spec == 'Windwalker Monk' || spec == 'Brewmaster Monk' || spec == 'Mistweaver Monk') {
      return '#00ff96';
    }
    if (spec == 'Fury Warrior' || spec == 'Arms Warrior' || spec == 'Protection Warrior') {
      return '#c79c6e';
    }
    if (spec == 'Affliction Warlock' || spec == 'Demonology Warlock' || spec == 'Destruction Warlock') {
      return '#9482c9';
    }
    if (spec == 'Shadow Priest' || spec == 'Holy Priest' || spec == 'Discipline Priest') {
      return '#c6c1b9';
    }
    if (spec == 'Retribution Paladin' || spec == 'Protection Paladin' || spec == 'Holy Paladin') {
      return '#f58cba';
    }
    return 'black';
  }

  getBosses() {
    forkJoin([
      this.RaidbotsApiService.getInstances(),
      this.RaidbotsApiService.getItemList()
    ]).subscribe({
      next: ([instancesData, itemListData]) => {
        // Aseguramos que los datos sean arrays
        if (Array.isArray(instancesData)) {
          instancesData.forEach((element: any) => {
            var instance = {
              id: element.id,
              name: element.name,
              type: element.type
            };
            this.instances.push(instance);
          });
        } else {
          console.error('La respuesta de las instancias no es un array', instancesData);
        }

        // Procesamos la lista de ítems solo si itemListData es un array
        if (Array.isArray(itemListData)) {
          this.itemList_full = itemListData;
          itemListData.forEach((element: any) => {
            if (element.sources) {
              var item = {
                id: element.id,
                drop: element.sources[0]
              };
              this.itemList.push(item);
            }
          });
        } else {
          console.error('La respuesta de los ítems no es un array', itemListData);
        }

        // Llamamos a getItemsDrop una vez que ambas respuestas se procesen
        this.getItemsDrop();
      },
      error: (err) => {
        console.error('Error en la llamada de forkJoin:', err);
      }
    });
  }

  async getItemsDrop() {
    var realItemList: any[] = [];

    // Usamos 'for...of' para poder usar 'await' dentro del ciclo
    for (const element of this.itemList) {
      var dropID = element.drop.instanceId;
      var ins = this.instances.find((item: { drop: any; id: any }) => dropID === item.id);

      var item: any = {};
      if (ins) {
        if (ins.type === 'raid') {
          if (element.drop.encounterId === -67) {
            item = {
              id: element.id,
              instance: ins,
              boss: 'catalyst',
            };
            realItemList.push(item);
          } else {
            // Aquí usamos 'await' para esperar a que 'getEncounter' se resuelva antes de continuar
            const encounterName = await this.getEncounter(element.drop.encounterId);
            item = {
              id: element.id,
              instance: ins,
              boss: encounterName,
            };
            realItemList.push(item);
          }
        } else {
          item = {
            id: element.id,
            instance: ins,
          };
          realItemList.push(item);
        }
      } else {
        item = {
          id: element.id,
          instance: ins,
        };
        realItemList.push(item);
      }
    }

    // Una vez procesados todos los elementos, actualizamos 'this.itemList'
    this.itemList = realItemList;

    // Llamamos a mergeItemList después de que todo haya terminado
    this.mergeItemList();
  }


  mergeItemList() {
    var realTableBistList: any[] = [];
    this.tableBisList.forEach((element: any) => {
      var itemID = parseInt(element.id);
      var itemEncontrado = this.itemList.find((item: any) => itemID === item.id);
      if (itemEncontrado) {
        var item = {};
        if (itemEncontrado.instance.type == "dungeon") {
          item = {
            id: itemID,
            spec: element.spec,
            img: element.img,
            name: element.name,
            instance: itemEncontrado.instance.name,
          }
          realTableBistList.push(item);
        } else if (itemEncontrado.instance.type == "raid") {
          item = {
            id: itemID,
            spec: element.spec,
            img: element.img,
            name: element.name,
            instance: itemEncontrado.instance.name,
            boss: itemEncontrado.boss
          }
          realTableBistList.push(item);
        } else if (itemEncontrado.instance.type.includes("profession")) {
          item = {
            id: itemID,
            spec: element.spec,
            img: element.img,
            name: element.name,
            instance: 'Crafted',
          }
          realTableBistList.push(item);
        } else if (itemEncontrado.instance.type == "catalyst") {
          var full = this.itemList_full.find((itemFull: any) => itemFull.id === itemID);
          var bossTier = this.comprobarTier(full.inventoryType, element.spec[0]);
          if (bossTier[0] == -1) {
            item = {
              id: itemID,
              spec: element.spec,
              img: element.img,
              name: element.name,
              instance: 'Catalyst',
            }
            realTableBistList.push(item);
          } else {
            item = {
              id: itemID,
              spec: element.spec,
              img: this.getTierImg(bossTier[1]),
              name: bossTier[2],
              instance: 'Tier',
            }
            realTableBistList.push(item);
          }
        } else {
          item = {
            id: itemID,
            spec: element.spec,
            img: element.img,
            name: element.name,
            instance: 'Desconocido',
          }
          realTableBistList.push(item);
        }
      } else {
        var item2: any = {
          id: itemID,
          spec: element.spec,
          img: element.img,
          name: element.name,
          instance: 'Desconocido'
        }
        realTableBistList.push(item2);
      }
    });

    realTableBistList = this.juntarTiers(realTableBistList);
    realTableBistList = this.ordenarTabla(realTableBistList);
    console.log(realTableBistList);

    this.tableBisList = realTableBistList;
  }

  ordenarTabla(tableBisList: any) {
    tableBisList.sort((a: any, b: any) => {
      // Primero comparamos la propiedad "instance"
      if (a.instance < b.instance) {
        return -1; // a debe ir antes que b
      }
      if (a.instance > b.instance) {
        return 1; // b debe ir antes que a
      }
  
      // Si las propiedades "instance" son iguales, comparamos "boss"
      if (a.boss && b.boss) {
        if (a.boss < b.boss) {
          return -1; // a debe ir antes que b
        }
        if (a.boss > b.boss) {
          return 1; // b debe ir antes que a
        }
      }
  
      // Si ambos son iguales, no cambiamos el orden
      return 0;
    });
  
    return tableBisList; // Devuelve el array ordenado
  }
  
  

  getTierImg(tier: any) {
    switch (tier) {
      case 0:
        return this.PH_image0;
      case 1:
        return this.PH_image1;
      case 2:
        return this.PH_image2;
      case 3:
        return this.PH_image3;
      default:
        return this.PH_image2;
    }
  }

  juntarTiers(tableBisList: any) {
    var slots = ["Head", "Shoulder", "Chest", "Hands", "Legs"];
    var n = [0, 1, 2, 3];

    // Recorremos todas las combinaciones posibles entre slots y n
    slots.forEach((slot) => {
      n.forEach((num) => {
        tableBisList = this.filtrarTiers(tableBisList, num, slot);
      });
    });

    return tableBisList;
  }

  filtrarTiers(tableBisList: any, num: any, slot: any) {
    const filteredList = tableBisList.filter((item: any) => item.instance === "Tier " + num && item.name === slot);

    if (filteredList.length > 0) {
      const mergedItem = { ...filteredList[0] }; // Clona el primer objeto encontrado
      mergedItem.spec = [...new Set(filteredList.flatMap((item: any) => item.spec))]; // Combina y elimina duplicados

      // Reemplaza los elementos filtrados con el objeto mergeado
      tableBisList = tableBisList.filter((item: any) => !(item.instance === "Tier " + num && item.name === slot));

      // Añade el objeto mergeado a la lista
      tableBisList.push(mergedItem);
    }
    return tableBisList;
  }

  getEncounter(id: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.blizzardService.getJournalEncounter(id).subscribe({
        next: (data) => {
          resolve(data.name); // Resolvemos la promesa con el nombre del encounter
        },
        error: (err) => {
          console.error('Error fetching journal encounter data', err);
          resolve("N/A"); // Resolvemos con un valor por defecto si hay error
        }
      });
    });
  }

  comprobarTier(slot: any, spec: any) {
    if (slot == 7) {
      return [2601, this.getTier(spec), 'Hands'];
    }
    if (slot == 5 || slot == 20) {
      return [2612, this.getTier(spec), 'Chest'];
    }
    if (slot == 10) {
      return [2599, this.getTier(spec), 'Legs'];
    }
    if (slot == 3) {
      return [2609, this.getTier(spec), 'Shoulder'];
    }
    if (slot == 1) {
      return [2608, this.getTier(spec), 'Head'];
    }
    return [-1, -1, ''];
  }


  getTier(spec: any) {
    if (spec == 'Devastation Evoker' || spec == 'Augmentation Evoker' || spec == 'Preservation Evoker') {
      return 0;
    }
    if (spec == 'Balance Druid' || spec == 'Feral Druid' || spec == 'Guardian Druid' || spec == 'Restoration Druid') {
      return 2;
    }
    if (spec == 'Unholy Death-Knight' || spec == 'Frost Death-Knight' || spec == 'Blood Death-Knight') {
      return 1;
    }
    if (spec == 'Havoc Demon-Hunter' || spec == 'Vengeance Demon-Hunter') {
      return 1;
    }
    if (spec == 'Mastery Hunter-Beast' || spec == 'Marksmanship Hunter' || spec == 'Survival Hunter') {
      return 2;
    }
    if (spec == 'Enhancement Shaman' || spec == 'Elemental Shaman' || spec == 'Restoration Shaman') {
      return 3;
    }
    if (spec == 'Assassination Rogue' || spec == 'Outlaw Rogue' || spec == 'Subtlety Rogue') {
      return 0;
    }
    if (spec == 'Arcane Mage' || spec == 'Frost Mage' || spec == 'Fire Mage') {
      return 2;
    }
    if (spec == 'Windwalker Monk' || spec == 'Brewmaster Monk' || spec == 'Mistweaver Monk') {
      return 0;
    }
    if (spec == 'Fury Warrior' || spec == 'Arms Warrior' || spec == 'Protection Warrior') {
      return 0;
    }
    if (spec == 'Affliction Warlock' || spec == 'Demonology Warlock' || spec == 'Destruction Warlock') {
      return 1;
    }
    if (spec == 'Shadow Priest' || spec == 'Holy Priest' || spec == 'Discipline Priest') {
      return 3;
    }
    if (spec == 'Retribution Paladin' || spec == 'Protection Paladin' || spec == 'Holy Paladin') {
      return 3;
    }
    return -1;
  }





}
