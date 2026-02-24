import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { LocalDataService } from '../services/local-data.service';
import { Router } from '@angular/router';
import { BlizzardApiService } from '../services/blizzard-api.service';
import { forkJoin, Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { RaidbotsApiService } from '../services/raidbots-api.service';
import { scrapeWowheadPage } from '../utils/wowhead-scraper';
import { extractWowheadBisList } from '../utils/wowhead-bis-parser';
import { environment } from 'src/environments/environment';

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
  tableBisList_full: any = [];
  instances: any = [];
  itemList: any = [];
  itemList_full: any = [];
  instancesLibrary: any[] = [];
  encounterLibrary: any[] = [];
  specsLibrary: any[] = [];
  slotsLibrary: any[] = [];
  tierItems: any[] = [];
  tierBreakGroups: any[] = [];
  tierSlots = ['head', 'shoulder', 'chest', 'hands', 'legs'];
  tierSlotVisuals: Record<string, { label: string; icon: string }> = {
    head: { label: 'Head', icon: '🪖' },
    shoulder: { label: 'Shoulder', icon: '🛡' },
    chest: { label: 'Chest', icon: '🦺' },
    hands: { label: 'Hands', icon: '🧤' },
    legs: { label: 'Legs', icon: '👖' },
  };
  encounterFlag = -1;
  isLoading: boolean = true;
  selectedInstance = '';
  selectedEncounter = '';
  selectedSpec = '';
  selectedSlot = '';
  isReloadingBis = false;
  isAdminConfigEnabled = false;
  showAdminModal = false;
  adminPasswordInput = '';
  adminPasswordError = '';
  wowIconBase = 'https://wow.zamimg.com/images/wow/icons/large/';
  private cacheApiBase = environment.cacheApiBase;
  private generatedBisSources: Record<string, string[]> = {};
  private encounterNameCache: Record<number, string> = {};
  private adminConfigStorageKey = 'config';
  private adminPassword = '6190';
  canReloadBisFromCurrentRuntime = false;

  constructor(
    private http: HttpClient,
    private LocalDataService: LocalDataService,
    private RaidbotsApiService: RaidbotsApiService,
    private blizzardService: BlizzardApiService,
    private router: Router) {
  }

  ngOnInit(): void {
    this.loadAdminConfigState();
    this.canReloadBisFromCurrentRuntime = this.canScrapeFromCurrentRuntime();
    this.loadInitialData();
  }

  private canScrapeFromCurrentRuntime(): boolean {
    if (this.cacheApiBase) {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    const host = window.location.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1';
  }

  async loadInitialData() {
    try {
      this.generatedBisSources = this.LocalDataService.getGeneratedBisSources();
      await this.getBisListData();
      await this.getBosses();
    } catch (error) {
      console.error("Hubo un error al cargar la bis list:", error);
    } finally {
      this.isLoading = false;
    }
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

  formatSlotLabel(slot: string) {
    if (slot === 'main_hand') {
      return 'Weapon';
    }
    if (slot === 'off_hand') {
      return 'Offhand';
    }
    return this.capitalizeFirstLetter(slot);
  }

  generateTable(bisList: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      var spec = bisList[0];
      bisList.slice(1).forEach((element: any) => {
        var item = {
          id: element,
          spec: [spec],
          img: null,
          name: `Item ${element}`,
        };

        // Comprobar si ya existe un ítem con el mismo id en tableBisList
        const existingItem = this.tableBisList.find((existingItem: { id: any; }) => existingItem.id === item.id);

        if (!existingItem) {
          this.tableBisList.push(item);
        } else {
          existingItem.spec.push(spec);
        }
      });
      resolve();
    });
  }

  loadAdminConfigState() {
    this.isAdminConfigEnabled = localStorage.getItem(this.adminConfigStorageKey) === 'true';
  }

  openAdminModal() {
    this.adminPasswordInput = '';
    this.adminPasswordError = '';
    this.showAdminModal = true;
  }

  closeAdminModal() {
    this.showAdminModal = false;
    this.adminPasswordInput = '';
    this.adminPasswordError = '';
  }

  submitAdminPassword() {
    if (this.adminPasswordInput === this.adminPassword) {
      localStorage.setItem(this.adminConfigStorageKey, 'true');
      this.isAdminConfigEnabled = true;
      this.closeAdminModal();
      return;
    }

    this.adminPasswordError = 'Password incorrecta';
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
        (data) => {
          resolve(data.name);
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
    if (spec == 'Beast-Mastery Hunter' || spec == 'Marksmanship Hunter' || spec == 'Survival Hunter') {
      return '#abd473';
    }
    if (spec == 'Enhancement Shaman' || spec == 'Elemental Shaman' || spec == 'Restoration Shaman') {
      return '#0070de';
    }
    if (spec == 'Assassination Rogue' || spec == 'Outlaw Rogue' || spec == 'Subtlety Rogue') {
      return '#e6d600';
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

  getBosses(): Promise<void> {
    return new Promise((resolve, reject) => {
      forkJoin([
        this.RaidbotsApiService.getInstances(),
        this.RaidbotsApiService.getItemList()
      ]).subscribe({
        next: async ([instancesData, itemListData]) => {
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
              const isUniversalTierToken = element.itemClass === 15
                && element.itemSubClass === 0
                && Array.isArray(element.contains)
                && element.contains.length > 20;
              if (isUniversalTierToken) {
                return;
              }

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
          await this.getItemsDrop();
          resolve();
        },
        error: (err) => {
          console.error('Error en la llamada de forkJoin:', err);
          reject(err);
        }
      });
    });
  }

  async getItemsDrop() {
    var realItemList: any[] = [];
    const encounterIds: number[] = [...new Set<number>(
      this.itemList
        .map((element: any) => Number(element?.drop?.encounterId))
        .filter((id: number) => Number.isInteger(id) && id > 0)
    )];

    const encounterNameMap: Record<number, string> = {};
    await Promise.all(encounterIds.map(async (encounterId: number) => {
      if (this.encounterNameCache[encounterId]) {
        encounterNameMap[encounterId] = this.encounterNameCache[encounterId];
        return;
      }
      const encounterName = await this.getEncounter(encounterId);
      if (encounterName && encounterName !== 'N/A') {
        this.encounterNameCache[encounterId] = encounterName;
        encounterNameMap[encounterId] = encounterName;
      }
    }));

    // Usamos 'for...of' para poder usar 'await' dentro del ciclo
    for (const element of this.itemList) {
      var dropID = element.drop.instanceId;
      var ins = this.instances.find((item: { drop: any; id: any }) => dropID === item.id);

      var item: any = {};
      if (ins) {
        if (ins.type === 'raid') {
          const encounterId = Number(element.drop.encounterId);
          if (encounterId === -67) {
            item = {
              id: element.id,
              instance: ins,
              boss: 'catalyst',
            };
            realItemList.push(item);
          } else if (encounterId <= 0) {
            item = {
              id: element.id,
              instance: ins,
              boss: 'BoE',
            };
            realItemList.push(item);
          } else {
            item = {
              id: element.id,
              instance: ins,
              boss: encounterNameMap[encounterId] || this.encounterNameCache[encounterId] || `Encounter ${encounterId}`,
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
      const sourceFallback = this.getFallbackSourceByItemId(itemID);
      if (itemEncontrado) {
        var item = {};
        const fullItem = this.itemList_full.find((itemFull: any) => itemFull.id === itemID);
        var iType = fullItem?.inventoryType;
        const itemName = fullItem?.name ?? element.name;
        const itemImg = fullItem?.icon ? `${this.wowIconBase}${fullItem.icon}.jpg` : element.img;
        const instanceType = itemEncontrado.instance?.type;
        if (instanceType == "dungeon") {
          item = {
            id: itemID,
            spec: element.spec,
            img: itemImg,
            name: itemName,
            instance: itemEncontrado.instance.name,
            iType: iType,
            sourceType: 'dungeon'
          }
          realTableBistList.push(item);
        } else if (instanceType == "raid") {
          item = {
            id: itemID,
            spec: element.spec,
            img: itemImg,
            name: itemName,
            instance: itemEncontrado.instance.name,
            boss: itemEncontrado.boss,
            iType: iType,
            sourceType: 'raid'
          }
          realTableBistList.push(item);
        } else if (instanceType?.includes("profession")) {
          item = {
            id: itemID,
            spec: element.spec,
            img: itemImg,
            name: itemName,
            instance: 'Crafted',
            iType: iType,
            sourceType: 'crafted'
          }
          realTableBistList.push(item);
        } else if (instanceType == "catalyst") {
          var bossTier = this.comprobarTier(fullItem?.inventoryType, element.spec[0]);
          if (bossTier[0] == -1) {
            item = {
              id: itemID,
              spec: element.spec,
              img: itemImg,
              name: itemName,
              instance: 'Catalyst',
              iType: iType,
              sourceType: 'catalyst'
            }
            realTableBistList.push(item);
          } else {
            item = {
              id: itemID,
              spec: element.spec,
              img: this.getTierImg(bossTier[1]),
              name: bossTier[2],
              instance: 'Tier',
              iType: iType,
              iTier: bossTier[1],
              sourceType: 'tier'
            }
            realTableBistList.push(item);
          }
        } else {
          item = {
            id: itemID,
            spec: element.spec,
            img: itemImg,
            name: itemName,
            instance: sourceFallback || 'Crafted',
            iType: iType,
            sourceType: sourceFallback ? 'fallback' : 'crafted-fallback'
          }   
          realTableBistList.push(item);
        }
      } else {
        var item2: any = {
          id: itemID,
          spec: element.spec,
          img: element.img,
          name: element.name,
          instance: sourceFallback || 'Crafted',
          sourceType: sourceFallback ? 'fallback' : 'crafted-fallback'
        }
        realTableBistList.push(item2);
      }
    });

    realTableBistList = this.juntarTiers(realTableBistList);
    realTableBistList = this.ordenarTabla(realTableBistList);

    this.tierItems = realTableBistList.filter((x: any) => x.instance === 'Tier');
    this.tierBreakGroups = this.buildTierBreakGroups(this.tierItems);

    const visibleBisList = realTableBistList.filter((x: any) => x.instance !== 'Tier');
    this.tableBisList = visibleBisList;
    this.tableBisList_full = visibleBisList;
    this.cargarDrops(this.tableBisList);
    this.enrichUnknownItemMetadata();
  }

  buildTierBreakGroups(tierItems: any[]) {
    const specToTierSlots = new Map<string, Set<string>>();

    tierItems.forEach((item: any) => {
      const slot = String(item?.name ?? '').toLowerCase();
      if (!this.tierSlots.includes(slot)) {
        return;
      }
      (item?.spec ?? []).forEach((spec: string) => {
        if (!specToTierSlots.has(spec)) {
          specToTierSlots.set(spec, new Set<string>());
        }
        specToTierSlots.get(spec)?.add(slot);
      });
    });

    const grouped = new Map<string, any[]>();
    specToTierSlots.forEach((slots, spec) => {
      const armorType = this.getArmorTypeBySpec(spec);
      const breakSlot = this.tierSlots.find((slot) => !slots.has(slot)) ?? '';
      const row = {
        spec,
        breakSlot,
      };

      if (!grouped.has(armorType)) {
        grouped.set(armorType, []);
      }
      grouped.get(armorType)?.push(row);
    });

    const armorOrder = ['Cloth', 'Leather', 'Mail', 'Plate', 'Unknown'];
    return [...grouped.entries()]
      .sort((a, b) => armorOrder.indexOf(a[0]) - armorOrder.indexOf(b[0]))
      .map(([armorType, specs]) => ({
        armorType,
        specs: specs.sort((a, b) => a.spec.localeCompare(b.spec)),
      }));
  }

  getArmorTypeBySpec(spec: string): string {
    const normalized = String(spec || '');
    if (normalized.includes('Demon-Hunter') || normalized.includes('Druid') || normalized.includes('Rogue') || normalized.includes('Monk')) {
      return 'Leather';
    }
    if (normalized.includes('Death-Knight') || normalized.includes('Paladin') || normalized.includes('Warrior')) {
      return 'Plate';
    }
    if (normalized.includes('Hunter') || normalized.includes('Shaman') || normalized.includes('Evoker')) {
      return 'Mail';
    }
    if (normalized.includes('Mage') || normalized.includes('Warlock') || normalized.includes('Priest')) {
      return 'Cloth';
    }
    return 'Unknown';
  }

  cargarDrops(bisList: any[]) {
    // Cargar filtro instances solo con opciones que tengan datos reales.
    const availableInstances = [...new Set(
      bisList
        .map(item => item.instance)
        .filter((instance: any) => instance && instance !== 'Desconocido')
    )];
    const mDungeons = this.instances
      .filter((ins: any) => ins.type === "dungeon" && availableInstances.includes(ins.name))
      .map((ins: any) => ins.name);
    const fallbackDungeons = [...new Set(
      bisList
        .filter((item: any) =>
          item.sourceType === 'fallback'
          && item.instance
          && item.instance !== 'Desconocido'
          && !/questline/i.test(String(item.instance))
        )
        .map((item: any) => item.instance)
    )];
    const mDungeonPool = [...new Set([...mDungeons, ...fallbackDungeons])];
    const fallbackLocations = [...new Set(
      bisList
        .filter((item: any) =>
          item.sourceType === 'fallback'
          && item.instance
          && item.instance !== 'Desconocido'
          && !mDungeonPool.includes(item.instance)
        )
        .map((item: any) => item.instance)
    )];

    this.instancesLibrary = ['M+ Dungeons'];
    if (availableInstances.includes('Catalyst')) {
      this.instancesLibrary.push('Catalyst');
    }
    if (availableInstances.includes('Crafted')) {
      this.instancesLibrary.push('Crafted');
    }
    if (availableInstances.includes('Tier')) {
      this.instancesLibrary.push('Tier');
    }

    const raidNamesWithData = this.instances
      .filter((ins: any) => ins.type === "raid" && availableInstances.includes(ins.name))
      .map((ins: any) => ins.name);
    this.instancesLibrary.push(...raidNamesWithData);
    this.instancesLibrary.push(...fallbackLocations);

    //Cargar filtro encounters
    var bossLibrary = [...new Set(
      bisList
        .map(item => item.boss) // Extrae la propiedad 'boss'
        .filter(boss => boss) // Filtra valores nulos o indefinidos
    )];
    this.encounterLibrary = [bossLibrary, mDungeonPool];

    // Cargar filtro specs
    this.specsLibrary = [...new Set(
      bisList
        .flatMap(item => item.spec)  // Aplana todos los arrays de 'spec'
        .filter(spec => spec)        // Filtra valores nulos o indefinidos
    )]
      .sort((a, b) => a.localeCompare(b)); // Ordena alfabéticamente de forma ascendente

    //Cargar filtro slot
    this.slotsLibrary = ['head', 'neck', 'shoulder', 'back', 'chest', 'waist', 'legs', 'feet', 'wrist', 'hands', 'finger', 'trinket', 'main_hand', 'off_hand'];
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
    const filteredList = tableBisList.filter((item: any) => item.instance === "Tier" && item.name === slot && item.iTier === num);

    if (filteredList.length > 0) {
      const mergedItem = { ...filteredList[0] }; // Clona el primer objeto encontrado
      mergedItem.spec = [...new Set(filteredList.flatMap((item: any) => item.spec))]; // Combina y elimina duplicados

      // Reemplaza los elementos filtrados con el objeto mergeado
      tableBisList = tableBisList.filter((item: any) => !(item.instance === "Tier" && item.name === slot && item.iTier === num));

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
    const slotName = this.getTierSlotName(slot);
    if (!slotName) {
      return [-1, -1, ''];
    }
    return [1, this.getTier(spec), slotName];
  }

  getTierSlotName(slot: any) {
    if (slot == 7) {
      return 'Hands';
    }
    if (slot == 5 || slot == 20) {
      return 'Chest';
    }
    if (slot == 10) {
      return 'Legs';
    }
    if (slot == 3) {
      return 'Shoulder';
    }
    if (slot == 1) {
      return 'Head';
    }
    return '';
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

  resetFiltros() {
    // Restablecer el valor de todos los filtros (usando los ids de los selects)
    const selects = document.querySelectorAll('select');
    selects.forEach((select: any) => {
      select.value = ''; // Restablecer el valor de cada select a vacío
    });
    this.selectedInstance = '';
    this.selectedEncounter = '';
    this.selectedSpec = '';
    this.selectedSlot = '';
    this.tableBisList = this.tableBisList_full;
    this.encounterFlag = -1;
  }

  filtrar(filtro: any, data: any) {
    const value = data.target.value;

    switch (filtro) {
      case 0:
        this.selectedInstance = value;
        this.selectedEncounter = '';
        const bossSelect = document.getElementById('bosses') as HTMLSelectElement | null;
        if (bossSelect) {
          bossSelect.value = '';
        }
        break;
      case 1:
        this.selectedEncounter = value;
        break;
      case 2:
        this.selectedSpec = value;
        break;
      case 3:
        this.selectedSlot = value;
        break;
      default:
        this.resetFiltros();
        return;
    }

    this.applyFilters();
  }

  applyFilters() {
    let dataFiltrada = [...this.tableBisList_full];

    if (this.selectedInstance) {
      if (this.selectedInstance === 'M+ Dungeons') {
        const mDungeons = this.encounterLibrary[1] || [];
        dataFiltrada = dataFiltrada.filter((i: any) => mDungeons.includes(i.instance));
        this.encounterFlag = 1;
      } else {
        dataFiltrada = dataFiltrada.filter((i: any) => i.instance === this.selectedInstance);
        const hasRaidBosses = dataFiltrada.some((i: any) => !!i.boss);
        this.encounterFlag = hasRaidBosses ? 0 : -1;
      }
    } else {
      this.encounterFlag = -1;
    }

    if (this.selectedEncounter) {
      if (this.encounterFlag === 0) {
        dataFiltrada = dataFiltrada.filter((i: any) => i.boss === this.selectedEncounter);
      } else if (this.encounterFlag === 1) {
        dataFiltrada = dataFiltrada.filter((i: any) => i.instance === this.selectedEncounter);
      }
    }

    if (this.selectedSpec) {
      dataFiltrada = dataFiltrada.filter((i: any) => i.spec.includes(this.selectedSpec));
      console.log(`[BiS Filter] Spec "${this.selectedSpec}": ${dataFiltrada.length} items`);
    }

    if (this.selectedSlot !== '') {
      const slotIndex = parseInt(this.selectedSlot, 10);
      const selectedSlotKey = this.slotsLibrary[slotIndex];
      dataFiltrada = dataFiltrada.filter((i: any) =>
        this.resolveSlotKeyByInventoryType(Number(i.iType)) === selectedSlotKey
      );
    }

    this.tableBisList = dataFiltrada;
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedInstance || this.selectedEncounter || this.selectedSpec || this.selectedSlot);
  }

  private resolveSlotKeyByInventoryType(inventoryType: number): string {
    switch (inventoryType) {
      case 1:
        return 'head';
      case 2:
        return 'neck';
      case 3:
        return 'shoulder';
      case 16:
        return 'back';
      case 5:
      case 20:
        return 'chest';
      case 6:
        return 'waist';
      case 7:
        return 'legs';
      case 8:
        return 'feet';
      case 9:
        return 'wrist';
      case 10:
        return 'hands';
      case 11:
        return 'finger';
      case 12:
        return 'trinket';
      case 14: // shield
      case 22: // weapon off-hand
      case 23: // holdable (off-hand)
        return 'off_hand';
      case 13: // one-hand weapon
      case 15: // ranged
      case 17: // two-hand weapon
      case 21: // weapon main-hand
      case 24: // ammo
      case 25: // thrown
      case 26: // ranged right
      case 27: // quiver
      case 28: // relic
        return 'main_hand';
      default:
        return '';
    }
  }

  goMain() {
    this.router.navigate(['/']);
  }

  async reloadBisFromWowhead() {
    if (this.isReloadingBis) {
      return;
    }

    if (!this.canReloadBisFromCurrentRuntime) {
      console.error('BiS reload disabled: no backend configured for Wowhead scraping in this environment.');
      return;
    }

    this.isReloadingBis = true;
    this.isLoading = true;
    const isDev = !environment.production;
    const sourceMap: Record<string, string[]> = {};

    // Requisito: borrar siempre la bislist actual al recargar (no caché de items).
    this.LocalDataService.clearGeneratedBisListTxt();
    this.LocalDataService.clearGeneratedBisSources();
    if (isDev) {
      console.log('[BiS Reload] Start: limpiando bislist generada actual');
    }

    try {
      const specMatrix = this.getWowheadSpecMatrix();
      const blocks: string[] = [];
      const specItemCounts: Record<string, number> = {};
      let okCount = 0;
      let failCount = 0;

      if (isDev) {
        console.log(`[BiS Reload] Total specs a procesar: ${specMatrix.length}`);
      }

      for (let index = 0; index < specMatrix.length; index++) {
        const spec = specMatrix[index];
        const url = `https://www.wowhead.com/guide/classes/${spec.classSlug}/${spec.specSlug}/bis-gear`;
        const label = `${spec.classLabel} ${spec.specLabel}`;

        try {
          if (isDev) {
            console.log(`[BiS Reload] [${index + 1}/${specMatrix.length}] Scraping ${label}`, url);
          }
          const scrapedPage = await scrapeWowheadPage(url, this.cacheApiBase);
          const bisItems = extractWowheadBisList(scrapedPage, 'Overall');

          if (bisItems.length === 0) {
            specItemCounts[label] = 0;
            failCount++;
            if (isDev) {
              console.warn(`[BiS Reload] ${label}: sin ítems en tab Overall`);
            }
            continue;
          }

          // Guardamos IDs únicos por spec.
          const uniqueIds = [...new Set(bisItems.map((x) => x.itemId))];
          specItemCounts[label] = uniqueIds.length;
          const lines = [`${spec.classLabel} ${spec.specLabel}`, ...uniqueIds.map((id) => id.toString()), ''];
          blocks.push(lines.join('\n'));
          bisItems.forEach((item) => {
            const key = String(item.itemId);
            if (!sourceMap[key]) {
              sourceMap[key] = [];
            }
            const source = this.selectSourceFallback(item.source);
            if (source && !sourceMap[key].includes(source)) {
              sourceMap[key].push(source);
            }
          });
          okCount++;

          if (isDev) {
            console.log(`[BiS Reload] ${label}: OK (${uniqueIds.length} itemIds únicos)`);
          }
        } catch (error) {
          specItemCounts[label] = 0;
          failCount++;
          console.error(`[BiS Reload] ${label}: ERROR scraping ${url}`, error);
        }
      }
      this.validateScrapedSpecCoverage(specMatrix, specItemCounts);

      const generatedBisList = blocks.join('\n');
      if (!generatedBisList.trim()) {
        throw new Error('No se pudo generar ninguna bislist desde Wowhead.');
      }

      this.LocalDataService.saveGeneratedBisListTxt(generatedBisList);
      this.LocalDataService.saveGeneratedBisSources(sourceMap);
      await this.persistGeneratedBisListSnapshot(generatedBisList, sourceMap);
      this.generatedBisSources = sourceMap;
      if (isDev) {
        console.log(`[BiS Reload] Guardado bisList generada. Specs OK: ${okCount}, fallidas/sin datos: ${failCount}`);
      }
      await this.reloadBisViewData();
      if (isDev) {
        console.log('[BiS Reload] Recarga de vista completada');
      }
    } catch (error) {
      console.error('Error recargando bislist desde Wowhead', error);
      // Si algo falla, restauramos estado de UI con datos actuales.
      await this.reloadBisViewData();
    } finally {
      this.isReloadingBis = false;
      this.isLoading = false;
      if (isDev) {
        console.log('[BiS Reload] End');
      }
    }
  }

  async reloadBisViewData() {
    this.tableBisList = [];
    this.tableBisList_full = [];
    this.instances = [];
    this.itemList = [];
    this.itemList_full = [];
    this.instancesLibrary = [];
    this.encounterLibrary = [];
    this.specsLibrary = [];
    this.slotsLibrary = [];
    this.generatedBisSources = this.LocalDataService.getGeneratedBisSources();
    this.resetFiltros();

    await this.getBisListData();
    await this.getBosses();
  }

  async persistGeneratedBisListSnapshot(content: string, sources: Record<string, string[]>) {
    if (!this.cacheApiBase) {
      return;
    }

    try {
      const response = await fetch(`${this.cacheApiBase}/bislist/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, sources }),
      });

      if (!response.ok) {
        throw new Error(`Snapshot save failed (${response.status})`);
      }
    } catch (error) {
      console.warn('No se pudo guardar snapshot estático de BiS en local.', error);
    }
  }

  getWowheadSpecMatrix() {
    return [
      { classLabel: 'Death-Knight', classSlug: 'death-knight', specLabel: 'Blood', specSlug: 'blood' },
      { classLabel: 'Death-Knight', classSlug: 'death-knight', specLabel: 'Frost', specSlug: 'frost' },
      { classLabel: 'Death-Knight', classSlug: 'death-knight', specLabel: 'Unholy', specSlug: 'unholy' },

      { classLabel: 'Demon-Hunter', classSlug: 'demon-hunter', specLabel: 'Havoc', specSlug: 'havoc' },
      { classLabel: 'Demon-Hunter', classSlug: 'demon-hunter', specLabel: 'Vengeance', specSlug: 'vengeance' },

      { classLabel: 'Druid', classSlug: 'druid', specLabel: 'Balance', specSlug: 'balance' },
      { classLabel: 'Druid', classSlug: 'druid', specLabel: 'Feral', specSlug: 'feral' },
      { classLabel: 'Druid', classSlug: 'druid', specLabel: 'Guardian', specSlug: 'guardian' },
      { classLabel: 'Druid', classSlug: 'druid', specLabel: 'Restoration', specSlug: 'restoration' },

      { classLabel: 'Evoker', classSlug: 'evoker', specLabel: 'Devastation', specSlug: 'devastation' },
      { classLabel: 'Evoker', classSlug: 'evoker', specLabel: 'Preservation', specSlug: 'preservation' },
      { classLabel: 'Evoker', classSlug: 'evoker', specLabel: 'Augmentation', specSlug: 'augmentation' },

      { classLabel: 'Hunter', classSlug: 'hunter', specLabel: 'Beast-Mastery', specSlug: 'beast-mastery' },
      { classLabel: 'Hunter', classSlug: 'hunter', specLabel: 'Marksmanship', specSlug: 'marksmanship' },
      { classLabel: 'Hunter', classSlug: 'hunter', specLabel: 'Survival', specSlug: 'survival' },

      { classLabel: 'Mage', classSlug: 'mage', specLabel: 'Arcane', specSlug: 'arcane' },
      { classLabel: 'Mage', classSlug: 'mage', specLabel: 'Fire', specSlug: 'fire' },
      { classLabel: 'Mage', classSlug: 'mage', specLabel: 'Frost', specSlug: 'frost' },

      { classLabel: 'Monk', classSlug: 'monk', specLabel: 'Brewmaster', specSlug: 'brewmaster' },
      { classLabel: 'Monk', classSlug: 'monk', specLabel: 'Mistweaver', specSlug: 'mistweaver' },
      { classLabel: 'Monk', classSlug: 'monk', specLabel: 'Windwalker', specSlug: 'windwalker' },

      { classLabel: 'Paladin', classSlug: 'paladin', specLabel: 'Holy', specSlug: 'holy' },
      { classLabel: 'Paladin', classSlug: 'paladin', specLabel: 'Protection', specSlug: 'protection' },
      { classLabel: 'Paladin', classSlug: 'paladin', specLabel: 'Retribution', specSlug: 'retribution' },

      { classLabel: 'Priest', classSlug: 'priest', specLabel: 'Discipline', specSlug: 'discipline' },
      { classLabel: 'Priest', classSlug: 'priest', specLabel: 'Holy', specSlug: 'holy' },
      { classLabel: 'Priest', classSlug: 'priest', specLabel: 'Shadow', specSlug: 'shadow' },

      { classLabel: 'Rogue', classSlug: 'rogue', specLabel: 'Assassination', specSlug: 'assassination' },
      { classLabel: 'Rogue', classSlug: 'rogue', specLabel: 'Outlaw', specSlug: 'outlaw' },
      { classLabel: 'Rogue', classSlug: 'rogue', specLabel: 'Subtlety', specSlug: 'subtlety' },

      { classLabel: 'Shaman', classSlug: 'shaman', specLabel: 'Elemental', specSlug: 'elemental' },
      { classLabel: 'Shaman', classSlug: 'shaman', specLabel: 'Enhancement', specSlug: 'enhancement' },
      { classLabel: 'Shaman', classSlug: 'shaman', specLabel: 'Restoration', specSlug: 'restoration' },

      { classLabel: 'Warlock', classSlug: 'warlock', specLabel: 'Affliction', specSlug: 'affliction' },
      { classLabel: 'Warlock', classSlug: 'warlock', specLabel: 'Demonology', specSlug: 'demonology' },
      { classLabel: 'Warlock', classSlug: 'warlock', specLabel: 'Destruction', specSlug: 'destruction' },

      { classLabel: 'Warrior', classSlug: 'warrior', specLabel: 'Arms', specSlug: 'arms' },
      { classLabel: 'Warrior', classSlug: 'warrior', specLabel: 'Fury', specSlug: 'fury' },
      { classLabel: 'Warrior', classSlug: 'warrior', specLabel: 'Protection', specSlug: 'protection' },
    ];
  }

  getCurrentBisItemIds(): number[] {
    const ids = new Set<number>();
    this.allBisList.forEach((specBlock: any[]) => {
      specBlock.slice(1).forEach((itemId: any) => {
        const n = Number(itemId);
        if (!Number.isNaN(n)) {
          ids.add(n);
        }
      });
    });
    return [...ids];
  }

  async enrichUnknownItemMetadata() {
    const unknownItems = this.tableBisList_full.filter(
      (item: any) => (!item.img || String(item.name).startsWith('Item '))
    );

    for (const item of unknownItems) {
      const itemId = Number(item.id);
      if (!Number.isInteger(itemId) || itemId <= 0) {
        continue;
      }

      try {
        const [nameData, mediaData] = await Promise.all([
          firstValueFrom(this.blizzardService.getItemName(itemId)),
          firstValueFrom(this.blizzardService.getItemMedia(itemId)),
        ]);

        const name = nameData?.name;
        const iconUrl = mediaData?.assets?.find((asset: any) => asset.key === 'icon')?.value;

        this.tableBisList_full.forEach((x: any) => {
          if (Number(x.id) === itemId) {
            if (name) {
              x.name = name;
            }
            if (iconUrl) {
              x.img = iconUrl;
            }
          }
        });
      } catch {
        // Silencioso en UI: si no hay cache/backend disponible, mantenemos placeholder.
      }
    }

    this.applyFilters();
  }

  async cacheMissingItems() {
    if (!this.cacheApiBase) {
      return;
    }
    const ids = this.getCurrentBisItemIds();
    if (ids.length === 0) {
      console.warn('[BiS Cache] No hay itemIds para cachear');
      return;
    }

    this.isLoading = true;
    try {
      const response = await fetch(`${this.cacheApiBase}/cache/items/prefetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: ids }),
      });

      if (!response.ok) {
        throw new Error(`Prefetch failed (${response.status})`);
      }

      const result = await response.json();
      console.log('[BiS Cache] Prefetch completado:', result);
    } catch (error) {
      console.error('[BiS Cache] Error cacheando items. ¿Está levantado server/server.js?', error);
    } finally {
      this.isLoading = false;
    }
  }

  async clearItemCache() {
    if (!this.cacheApiBase) {
      return;
    }
    this.isLoading = true;
    try {
      const response = await fetch(`${this.cacheApiBase}/cache/items`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Clear cache failed (${response.status})`);
      }

      const result = await response.json();
      console.log('[BiS Cache] Cache limpiada:', result);
    } catch (error) {
      console.error('[BiS Cache] Error limpiando cache. ¿Está levantado server/server.js?', error);
    } finally {
      this.isLoading = false;
    }
  }

  private getFallbackSourceByItemId(itemId: number): string {
    const sources = this.generatedBisSources[String(itemId)] ?? [];
    const fallback = sources.find((s) => !!s && s !== 'Unknown' && s !== 'Desconocido');
    return fallback ?? '';
  }

  private selectSourceFallback(rawSource: string): string {
    const cleaned = String(rawSource ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\|/g, ' ')
      .trim();
    if (!cleaned) {
      return '';
    }
    if (/(blacksmithing|leatherworking|tailoring|jewelcrafting|inscription|alchemy|engineering|enchanting)/i.test(cleaned)) {
      return 'Crafted';
    }
    if (/questline/i.test(cleaned)) {
      return 'Questline';
    }

    const parts = cleaned.split(' ');
    if (parts.length === 1 && /^[A-Z][a-z]+$/.test(parts[0])) {
      // Evita guardar labels demasiado genéricos tipo "Raid" o "Vault".
      return '';
    }

    return cleaned;
  }

  private validateScrapedSpecCoverage(
    specMatrix: Array<{ classLabel: string; specLabel: string }>,
    specItemCounts: Record<string, number>
  ) {
    const expectedLabels = specMatrix.map((spec) => `${spec.classLabel} ${spec.specLabel}`);
    const missingSpecs = expectedLabels.filter((label) => !(label in specItemCounts));
    const specsUnderMin = expectedLabels
      .filter((label) => (specItemCounts[label] ?? 0) < 15)
      .map((label) => `${label} (${specItemCounts[label] ?? 0})`);

    console.log(
      `[BiS Reload][Validation] Specs esperadas: ${expectedLabels.length}, scrapeadas: ${Object.keys(specItemCounts).length}`
    );

    if (missingSpecs.length > 0) {
      console.error('[BiS Reload][Validation] Faltan specs:', missingSpecs);
    }

    if (specsUnderMin.length > 0) {
      console.error('[BiS Reload][Validation] Specs con menos de 15 items:', specsUnderMin);
    } else {
      console.log('[BiS Reload][Validation] OK: todas las specs tienen al menos 15 items.');
    }
  }




}
