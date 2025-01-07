import { Component, HostListener, OnChanges, OnInit, SimpleChanges, ViewChildren } from '@angular/core';
import { Boss, Items, ItemsLibrary, Slot } from '../interfaces/items.interface';
import { RaidbotsApiService } from '../services/raidbots-api.service';
import { DiscordApiService } from '../services/discord-api.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalDataService } from '../services/local-data.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  providers: [RaidbotsApiService],
})
export class MainComponent implements OnInit {
  private _bossesURL = 'assets/json/vault_incarnates.json';
  bosses = [];
  items: Items = {
    head: [],
    neck: [],
    shoulder: [],
    back: [],
    chest: [],
    wrist: [],
    hands: [],
    waist: [],
    legs: [],
    feet: [],
    finger: [],
    trinket: [],
    main_hand: [],
    off_hand: [],
  };
  listSlots = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger', 'trinket', 'main_hand', 'off_hand'];
  aitems: any[] = [];
  fitems: any[] = [];
  base_url = 'https://www.raidbots.com/simbot/report/';
  reports: string[] = [];
  listBosses: any[] = [];
  itemsLibrary: ItemsLibrary[] = [];
  PH_image = 'https://wow.zamimg.com/images/wow/icons/large/inv_10_jewelcrafting_gem3primal_fire_cut_blue.jpg';
  base_img = 'https://wow.zamimg.com/images/wow/icons/large/';
  encounterLibrary: Boss[] = [];
  playersLibrary: any = [];
  playerCargado: string = '';
  bossCargado: string = '';
  checkDiv: boolean = false;
  checkArray: any = [];
  actualIlvl: number = 0;
  actualSpec: string = '';
  @ViewChildren('myselect') select: any;
  YOUR_AUTHORIZATION_CODE = 'kXnSmYA60XPENHCp83XlLNY3fwOojI';
  allSimList: any = [];
  allBisList: any = [];
  tierSlots: any[] = [];

  constructor(
    private http: HttpClient,
    private RaidbotsApiService: RaidbotsApiService,
    private LocalDataService: LocalDataService,
    private DiscordApiService: DiscordApiService
  ) { }

  public getJSON(url: any): Observable<any> {
    return this.http.get(url);
  }

  ngOnInit(): void {
    //this.getDiscord();
    this.getTxt();
  }

  async getDiscord() {
    await this.DiscordApiService.getAuthorize(this.YOUR_AUTHORIZATION_CODE);
    this.DiscordApiService.getMensajes('1006082307641319455').subscribe(
      (data: any) => {
        console.log('Mensajes obtenidos:', data);
      },
      error => {
        console.error('Error al obtener los mensajes:', error);
      }
    );
  }


  getTxt() {
    this.getBisListData();
    this.LocalDataService.getDroptimizers().subscribe((data: any) => {
      var str = data.split(/[\r\n\s]+/);
      str.forEach((element: any) => {
        this.getReports(element);
      });
      this.reports.forEach((report: any) => {
        this.RaidbotsApiService.getDroptimizer(report).subscribe((data) => {
          if (this.encounterLibrary.length == 0) {
            this.getBossLibrary(data);
          }
          this.addPlayer(data, report);
          this.playersLibrary.sort((a: any, b: any) => a.name.localeCompare(b.name));
          this.getItemsLibrary(data);
          this.getDroptimizer(data);
          //Shaman Enh esta bug
          this.getBisListData();
          this.cargarTiersPlayer();
        });
      });
    });
  }

  addPlayer(data: any, report: any) {
    const _url = `https://www.raidbots.com/simbot/${report}/`;
    var player = data.sim.players[0].name;
    var spec = data.sim.players[0].specialization;
    var existe = this.playersLibrary.find((x: any) => x.name.toLowerCase() == player.toLowerCase());
    var gear = data.sim.players[0].gear;
    var ilvl = this.calcularIlvl(gear);
    var gearIlvl = this.calcularGearIlvl(gear);
    if (!existe) {
      this.playersLibrary.push({ name: player, ilvl: ilvl, spec: spec, gear: gear, gearIlvl: gearIlvl, report: _url });
    } else {
      var existeIlvl = existe.ilvl;
      if (ilvl > existeIlvl) {
        this.playersLibrary.find((x: any) => x.name.toLowerCase() == player.toLowerCase()).ilvl = ilvl;
      }
    }
  }

  transformObjectGear = (obj: Record<string, any>) => {
    const transformed: Record<string, { id: number, ilevel: number }> = {};

    for (const key in obj) {
      const { encoded_item, ilevel } = obj[key];

      // Extraer el ID usando una expresión regular
      const idMatch = encoded_item.match(/id=(\d+)/);
      const id = idMatch ? parseInt(idMatch[1], 10) : null;

      if (id) {
        transformed[key] = { id, ilevel };
      }
    }

    return transformed;
  };

  calcularGearIlvl(gear: any) {
    const resultado = Object.keys(gear).map(key => ({
      name: key,
      value: gear[key]['ilevel']
    }));
    return resultado;
  }

  calcularIlvl(gear: any) {
    var total = 0;
    var cont = 0;
    var temp = 0;
    Object.values(gear).forEach((value: any, index) => {
      total += value.ilevel;
      cont++;
      temp = value.ilevel;
    });
    if (cont == 15) {
      total += temp;
    }
    total = total / 16;
    total = Math.round(total * 100) / 100;
    return total;
  }

  getBossLibrary(data: any) {
    var bosses = data.simbot.meta.itemLibrary[0].instance.encounters;
    bosses.forEach((element: any) => {
      var boss = {
        id: element.id,
        name: element.name
      };
      this.encounterLibrary.push(boss);
    });
  }

  getItemsLibrary(data: any) {
    var library = data.simbot.meta.itemLibrary;
    library.forEach((item: any) => {
      var existe = false;
      this.itemsLibrary.forEach((element: any) => {
        if (item.id == element.id) {
          existe = true;
        }
      });
      if (!existe) {
        var itemReal = {
          id: item.id,
          name: item.name,
          icon: item.icon,
          boss: item.encounter.id,
          stats: item.stats
        }
        this.itemsLibrary.push(itemReal);
      } else {
        if (this.comprobarTierItem(item)) {
          const existingItem = this.itemsLibrary.find((element: any) => element.id === item.id);
          if (existingItem) {
            existingItem.boss = item.encounter.id;
          }
        }
      }
    });
  }

  getReports(txt: any) {
    var str = txt.split("https://www.raidbots.com/simbot/report/");
    if (str.length > 1) {
      //var url = this.base_url + str[1] + '/';
      var url = "report/" + str[1];
      this.reports.push(url);
    }
  }

  getDroptimizer(data: any) {
    var sim = data.sim;
    var nombre = this.capitalizeFirstLetter(sim.players[0].name);
    var spec = sim.players[0].specialization;
    var actualDPS = Math.round(sim.statistics.raid_dps.mean);
    var player = {
      name: nombre,
      spec: spec,
      dps: actualDPS
    }

    var results = sim.profilesets.results;
    results.forEach((element: any) => {
      this.getItem(element, player);
    });

    this.aitems = Object.entries(this.items);
    this.aitems.forEach((element: any) => {
      this.comprobarDuplicados(element[1]);
    });
    this.aitems = Object.entries(this.items);

    this.aitems = this.comprobarCatalyst(this.aitems);
    this.fitems = this.aitems;
  }

  quitarVacios(slot: any) {
    if (slot[1] && slot[1] == '') {
      return false;
    }
    return true;
  }

  getItem(item: any, player: any) {
    var str = item.name.split("/", 7);
    var item_id = str[3];
    var item_boss = str[1];
    var item_slot: string = this.comprobarSlot(str[6]);
    var item_dps = Math.round(item.mean);
    var item_realDPS = item_dps - player.dps;
    var item_armor = this.getArmor(player.spec, item_slot);
    var tier = this.comprobarTier(item_boss, item_slot, player.spec);
    var item_exactID: number = -1;
    if (tier != -1) {
      item_exactID = item_id;
      item_id = item_boss + tier;
      item_armor = 'Tier';
    }

    if (item_realDPS > 0) {
      var simC = {
        name: player.name,
        spec: player.spec,
        dps: item_realDPS
      }

      type ObjectKey = keyof typeof this.items;
      var allItems = this.items[item_slot as ObjectKey];


      var existe = false;
      if (allItems) {
        allItems.forEach((element: any) => {
          if (element) {
            if (element.id == item_id) {
              existe = true;
              if (item_exactID != -1) {
                if (!element.exactID) {
                  element.exactID = [];
                } else {
                  element.exactID.push(item_exactID);
                }
              }
              if (!element.sim) {
                element.sim = [];
              }

              element.sim.push(simC);
            }
          }
        });
      };

      if (existe == false) {
        var item_descrip = {
          id: item_id,
          armor: item_armor,
          tier: -1,
          exactID: [] as number[],
          boss: item_boss,
          sim: [simC]
        }
        var tier = this.comprobarTier(item_descrip.boss, item_slot, player.spec);
        if (tier != -1) {
          item_descrip.tier = tier
          item_descrip.exactID.push(item_descrip.id);
          item_descrip.id = item_boss + tier;
        }
        if (allItems) {
          allItems.push(item_descrip);
        }
      }
    }
  }

  comprobarDuplicados(items: any) {
    items.forEach((item: any) => {
      var sim = item.sim;
      if (sim.length > 1) {
        var realSim: Object[] = [];
        sim.forEach((simC: any) => {
          var existe: boolean = false;
          realSim.forEach((data: any) => {
            if (simC.name == data.name) {
              existe = true;
              if (simC.dps > data.dps) {
                data.dps = simC.dps;
              }
            }
          });
          if (!existe) {
            realSim.push(simC);
          }
        });
        item.sim = realSim;
      }
    });
  }

  comprobarTierItem(item: any, slot?: any) {
    if (item.icon.includes('helm') || slot == 'head') {
      if (item.encounter && item.encounter.id == 2608 || item.boss == 2608) {
        return true;
      }
    }

    if (item.icon.includes('pant') || slot == 'legs') {
      if (item.encounter && item.encounter.id == 2601 || item.boss == 2601) {
        return true;
      }
    }

    if (item.icon.includes('shoulder') || slot == 'shoulder') {
      if (item.encounter && item.encounter.id == 2609 || item.boss == 2609) {
        return true;
      }
    }

    if (item.icon.includes('chest') || slot == 'chest') {
      if (item.encounter && item.encounter.id == 2612 || item.boss == 2612) {
        return true;
      }
    }

    if (item.icon.includes('glove') || slot == 'hands') {
      if (item.encounter && item.encounter.id == 2599 || item.boss == 2599) {
        return true;
      }
    }

    return false;
  }

  comprobarTier(boss: any, slot: any, spec: any) {
    if (boss == '2601' && slot == 'legs') {
      return this.getTier(spec);
    }
    if ((boss == '2612') && slot == 'chest') {
      return this.getTier(spec);
    }
    if (boss == '2599' && slot == 'hands') {
      return this.getTier(spec);
    }
    if (boss == '2609' && slot == 'shoulder') {
      return this.getTier(spec);
    }
    if (boss == '2608' && slot == 'head') {
      return this.getTier(spec);
    }
    return -1;
  }

  comprobarSlot(slot: any) {
    if (slot == 'trinket1') {
      return 'trinket';
    }
    if (slot == 'trinket2') {
      return 'trinket';
    }
    if (slot == 'finger1') {
      return 'finger';
    }
    if (slot == 'finger2') {
      return 'finger';
    }
    return slot;
  }

  getBoss(id: any) {
    var retorna = 'Trash Drop';
    this.encounterLibrary.forEach(element => {
      var element_id = element.id;
      if (id == element_id) {
        retorna = element.name;
      }
    });
    return retorna;
  }

  sortChart(items: any) {
    var sorted = items.sort((a: any, b: any) => (a.dps > b.dps ? -1 : 1));
    return sorted;
  }

  getChartData(id: any) {
    var items = Object.entries(this.items);
    var chart_names: string[] = [];
    var chart_dps: number[] = [];
    var chart_color: string[] = [];

    items.forEach(element => {
      var e: Slot[] = element[1] as Slot[];
      e.forEach(slot => {
        if (slot.id == id) {
          var slots = this.sortChart(slot.sim);
          slots.forEach((slot: { name: string; dps: number; spec: any; }) => {
            chart_names.push(slot.name);
            chart_dps.push(slot.dps);
            chart_color.push(this.generateColor(slot.spec));
          });
        }
      });
    });

    var barChartData = {
      labels: chart_names,
      datasets: [
        { data: chart_dps, label: '', backgroundColor: chart_color, },
      ]
    };

    return barChartData;
  }

  quitarVacioSpec(spec: any) {
    var palabras = spec.split(" ");
    if (palabras.length > 2) {
      if (palabras[0] == 'Beast') {
        return 'Beast-Mastery Hunter';
      }
      var cadena = palabras[0] + " " + palabras[1] + "-" + palabras[2];
      return cadena;
    }
    return spec;
  }

  buscarCatalyst(id: any) {
    var idList = [id];
    const result = this.aitems.flatMap((item: any) => item[1]).find((x: any) => x.exactID == id);
    if (result !== undefined) {
      idList.push(result.id);
    }
    const result2 = this.aitems.flatMap((item: any) => item[1]).find((x: any) => x.id == id);
    if (result2 !== undefined) {
      if (result2.exactID[0] !== undefined) {
        idList.push(result2.exactID[0]);
      }
    }
    return idList;
  }

  getCharOptions(item: any) {
    var colors: any[] = [];
    var id = item.id;
    var sim = item.sim;

    sim.forEach((element: any) => {
      var spec = this.quitarVacioSpec(element.spec);
      var bisList = this.allBisList.find((x: any[]) => x[0] == spec);
      if (bisList) {
        var existe = false;
        existe = bisList.find((x: any[]) => x == id);
        if (!existe) {
          colors.push('red');
        } else {
          colors.push('black');
        }
      }
    });

    var barChartOptions = {
      scales: {
        x: {
          ticks: {
            color: function (context: { index: any; }) {
              const index = context.index;
              return colors[index % colors.length];
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    };

    return barChartOptions;
  }

  generateColor(spec: any) {
    if (spec == 'Devastation Evoker' || spec == 'Augmentation Evoker') {
      return '#33937f';
    }
    if (spec == 'Balance Druid' || spec == 'Feral Druid' || spec == 'Guardian Druid') {
      return '#ff7d0a';
    }
    if (spec == 'Unholy Death Knight' || spec == 'Frost Death Knight' || spec == 'Blood Death Knight') {
      return '#c41f3b';
    }
    if (spec == 'Havoc Demon Hunter' || spec == 'Vengeance Demon Hunter') {
      return '#a330c9';
    }
    if (spec == 'Beast Mastery Hunter' || spec == 'Marksmanship Hunter' || spec == 'Survival Hunter') {
      return '#abd473';
    }
    if (spec == 'Enhancement Shaman' || spec == 'Elemental Shaman') {
      return '#0070de';
    }
    if (spec == 'Assassination Rogue' || spec == 'Outlaw Rogue' || spec == 'Subtlety Rogue') {
      return '#fff569';
    }
    if (spec == 'Arcane Mage' || spec == 'Frost Mage' || spec == 'Fire Mage') {
      return '#69ccf0';
    }
    if (spec == 'Windwalker Monk' || spec == 'Brewmaster Monk') {
      return '#00ff96';
    }
    if (spec == 'Fury Warrior' || spec == 'Arms Warrior' || spec == 'Protection Warrior') {
      return '#c79c6e';
    }
    if (spec == 'Affliction Warlock' || spec == 'Demonology Warlock' || spec == 'Destruction Warlock') {
      return '#9482c9';
    }
    if (spec == 'Shadow Priest') {
      return '#e8e6e3';
    }
    if (spec == 'Retribution Paladin' || spec == 'Protection Paladin') {
      return '#f58cba';
    }
    return 'black';
  }

  getArmor(spec: any, slot: any) {
    if (slot == 'trinket' || slot == 'finger' || slot == 'main_hand' || slot == 'off_hand' || slot == 'back' || slot == 'neck') {
      return '';
    }
    if (spec == 'Devastation Evoker' || spec == 'Augmentation Evoker') {
      return 'Mail';
    }
    if (spec == 'Balance Druid' || spec == 'Feral Druid' || spec == 'Guardian Druid') {
      return 'Leather';
    }
    if (spec == 'Unholy Death Knight' || spec == 'Frost Death Knight' || spec == 'Blood Death Knight') {
      return 'Plate';
    }
    if (spec == 'Havoc Demon Hunter' || spec == 'Vengeance Demon Hunter') {
      return 'Leather';
    }
    if (spec == 'Beast Mastery Hunter' || spec == 'Marksmanship Hunter' || spec == 'Survival Hunter') {
      return 'Mail';
    }
    if (spec == 'Enhancement Shaman' || spec == 'Elemental Shaman') {
      return 'Mail';
    }
    if (spec == 'Assassination Rogue' || spec == 'Outlaw Rogue' || spec == 'Subtlety Rogue') {
      return 'Leather';
    }
    if (spec == 'Arcane Mage' || spec == 'Frost Mage' || spec == 'Fire Mage') {
      return 'Cloth';
    }
    if (spec == 'Windwalker Monk' || spec == 'Brewmaster Monk') {
      return 'Leather';
    }
    if (spec == 'Fury Warrior' || spec == 'Arms Warrior' || spec == 'Protection Warrior') {
      return 'Plate';
    }
    if (spec == 'Affliction Warlock' || spec == 'Demonology Warlock' || spec == 'Destruction Warlock') {
      return 'Cloth';
    }
    if (spec == 'Shadow Priest') {
      return 'Cloth';
    }
    if (spec == 'Retribution Paladin' || spec == 'Protection Paladin') {
      return 'Plate';
    }
    return '';
  }

  getTier(spec: any) {
    if (spec == 'Devastation Evoker' || spec == 'Augmentation Evoker') {
      return 0;
    }
    if (spec == 'Balance Druid' || spec == 'Feral Druid' || spec == 'Guardian Druid') {
      return 2;
    }
    if (spec == 'Unholy Death Knight' || spec == 'Frost Death Knight' || spec == 'Blood Death Knight') {
      return 1;
    }
    if (spec == 'Havoc Demon Hunter' || spec == 'Vengeance Demon Hunter') {
      return 1;
    }
    if (spec == 'Beast Mastery Hunter' || spec == 'Marksmanship Hunter' || spec == 'Survival Hunter') {
      return 2;
    }
    if (spec == 'Enhancement Shaman' || spec == 'Elemental Shaman') {
      return 3;
    }
    if (spec == 'Assassination Rogue' || spec == 'Outlaw Rogue' || spec == 'Subtlety Rogue') {
      return 0;
    }
    if (spec == 'Arcane Mage' || spec == 'Frost Mage' || spec == 'Fire Mage') {
      return 2;
    }
    if (spec == 'Windwalker Monk' || spec == 'Brewmaster Monk') {
      return 0;
    }
    if (spec == 'Fury Warrior' || spec == 'Arms Warrior' || spec == 'Protection Warrior') {
      return 0;
    }
    if (spec == 'Affliction Warlock' || spec == 'Demonology Warlock' || spec == 'Destruction Warlock') {
      return 1;
    }
    if (spec == 'Shadow Priest') {
      return 3;
    }
    if (spec == 'Retribution Paladin' || spec == 'Protection Paladin') {
      return 3;
    }
    return -1;
  }



  capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  filtrar(data: any) {
    var boss = data.target.value;
    this.playerCargado = '';
    this.bossCargado = boss;
    if (this.checkDiv) {
      this.getRotation();
    } else {
      this.actualIlvl = 0;
      this.checkDiv = false;
      if (boss) {
        this.fitems = this.aitems;
        var titems: any[] = [];
        this.fitems.forEach((element: any) => {
          var tslot: any[] = [];
          if (element[1]) {
            var bosses = element[1];
            bosses.forEach((item: any) => {
              if (item.boss == boss) {
                tslot.push(item);
              }
            });
            titems.push([element[0], tslot]);
          }
        });
        this.fitems = titems;
      } else {
        this.fitems = this.aitems;
      }
    }
  }

  filtrar2(data: any) {
    this.actualIlvl = 0;
    var slot = data.target.value;
    this.playerCargado = '';
    this.bossCargado = '';
    this.checkDiv = false;
    if (slot) {
      var titems: any[] = [];
      this.fitems.forEach((element: any) => {
        if (element[0] == slot) {
          titems.push(element);
        }
      });
      this.fitems = titems;
    } else {
      this.fitems = this.aitems;
    }
  }

  filtrar3(data: any) {
    var player = data.target.value;
    if (player) {
      this.playerCargado = player;
      this.bossCargado = '';
      this.fitems = this.aitems;
      var titems: any[] = [];
      this.fitems.forEach((element: any) => {
        var telement: any[] = [];
        element[1].forEach((datos: any) => {
          var sim = datos.sim;
          var existe = sim.find((x: { name: any; }) => x.name.toLowerCase() == player.toLowerCase());
          if (existe) {
            telement.push(datos);
          }
        });
        var tslot = [element[0], telement];
        titems.push(tslot);
      });
      this.fitems = titems;
      this.cargarActualIlvl(player);
      if (this.checkDiv) {
        this.checkIlvl();
      }
    } else {
      this.actualIlvl = 0;
      this.fitems = this.aitems;
      this.playerCargado = '';
    }
  }

  filtrar4(data: any) {
    this.checkDiv = false;
    var dps = parseInt(data.target.value);
    if (data) {
      //this.fitems = this.aitems;
      var titems: any[] = [];
      this.fitems.forEach((element: any) => {
        var telement: any[] = [];
        element[1].forEach((datos: any) => {
          var sim = datos.sim;
          var existe = sim.find((x: { dps: number; }) => x.dps >= dps);
          if (existe) {
            telement.push(datos);
          }
        });
        var tslot = [element[0], telement];
        titems.push(tslot);
      });
      this.fitems = titems;
    } else {
      this.fitems = this.aitems;
    }
  }

  resetAll() {
    this.fitems = this.aitems;
    this.select.forEach((element: any) => {
      element.nativeElement.value = '';
    });
    this.actualIlvl = 0;
    this.actualSpec = '';
    this.playerCargado = '';
    this.bossCargado = '';
    this.checkDiv = false;
  }

  checkIlvl() {
    var resultado = this.playersLibrary.filter((x: any) => x.name == this.playerCargado);
    if (resultado.length > 1) {
      const maxValues = resultado.reduce((acc: { [x: string]: number; }, curr: { [x: string]: number; }) => {
        for (let key in curr) {
          if (!acc[key]) {
            acc[key] = curr[key];
          } else {
            acc[key] = Math.max(acc[key], curr[key]);
          }
        }
        return acc;
      }, {});
      this.checkArray = maxValues;
    } else {
      this.checkArray = resultado[0];
    }
    this.checkDiv = true;
  }

  getArrayFromObject(obj: any): any[] {
    return Object.entries(obj).map(([key, value]) => ({ name: key, value }));
  }

  checkStyleIlvl(ilvl: any) {
    var value = parseInt(ilvl);
    if (value < 610) {
      return 'red';     // Menor que 610 -> rojo
    } else if (value >= 610 && value < 619) {
      return 'orange';  // Entre 610 y 619 -> naranja
    } else {
      return 'black';   // Mayor o igual que 619 -> negro
    }
  }

  cargarActualIlvl(player: any) {
    var obj = this.playersLibrary.find((x: { name: any; }) => x.name.toLowerCase() == player.toLowerCase());
    this.actualIlvl = obj.ilvl;
    this.actualSpec = obj.spec;
  }

  comprobarCatalyst(data: any) {
    var totalArray: any[] = [];
    data.forEach((element: any) => {
      var tempArray: any[] = [];
      if (this.comprobarSlotCatalyst(element[0])) {
        element[1].forEach((item: any) => {
          var existe = false;
          if (item.armor != 'Tier') {
            tempArray.forEach((value: any) => {
              if (value) {
                if ((value.armor == item.armor) && (value.boss == item.boss)) {
                  existe = true;
                  var existeSim = false;
                  value.sim.forEach((sim: any) => {
                    item.sim.forEach((itemSim: any) => {
                      if (sim.name == itemSim.name) {
                        if (itemSim.dps > sim.dps) {
                          sim.dps = itemSim.dps;
                        }
                        existeSim = true;
                      }
                    });
                  });
                  if (!existeSim) {
                    value.sim.push(item.sim[0]);
                  }
                  value.exactID.push(item.id);
                }
              }
            });
          }
          if (!existe) {
            tempArray.push(item);
          }
        });
      } else {
        tempArray = element[1];
      }
      totalArray.push([element[0], tempArray]);
    });
    return totalArray;
  }

  comprobarSlotCatalyst(slot: any) {
    if (slot == 'trinket') {
      return false;
    }
    if (slot == 'finger') {
      return false;
    }
    if (slot == 'main_hand') {
      return false;
    }
    if (slot == 'off_hand') {
      return false;
    }
    return true;
  }

  getImgLink(id: any) {
    var item = this.itemsLibrary.find(x => x.id == id);
    if (!item) {
      return this.PH_image;
    } else {
      var icon = this.base_img + item.icon + '.jpg';
      return icon;
    }
  }

  getRotation() {
    this.checkDiv = true;
    var idBoss = this.bossCargado;

    //Extraigo todos los items con mejoras del boss
    var titems: any[] = [];
    this.aitems.forEach((element: any) => {
      var tslot: any[] = [];
      if (element[1]) {
        var bosses = element[1];
        bosses.forEach((item: any) => {
          if (item.boss == idBoss) {
            tslot.push(item);
          }
        });
        titems.push([element[0], tslot]);
      }
    });
    var allItems = titems;

    //Cargo todas las mejoras
    var playersSimList: { name: any; item: any; pos: number; spec: any }[] = [];
    allItems.forEach((slot: any) => {
      if (slot[1].length > 0) {
        slot[1].forEach((element: any) => {
          var simList = element.sim.sort((a: { dps: number; }, b: { dps: number; }) => b.dps - a.dps);
          simList.forEach((sim: any, index: number) => {
            var player = this.playersLibrary.filter((obj: any) => obj.name === sim.name)
            var playerSim = { name: sim.name, item: element.id, pos: index + 1, spec: player[0].spec };
            playersSimList.push(playerSim);
          });
        });
      }
    });

    //Agrupo las mejoras por players
    this.allSimList = [];
    this.playersLibrary.forEach((player: any) => {
      const resultados = playersSimList.filter(obj => obj.name === player.name);
      if (resultados.length > 0) {
        this.allSimList.push(resultados);
      }
    });
  }

  getColor(pos: any) {
    if (pos == 1) {
      return 'green';
    }
    if (pos == 2) {
      return 'yellow';
    }
    if (pos == 3) {
      return 'orange';
    }
    return '';
  }

  getRotacionBis(item: any) {
    var bisList = this.allBisList.find((x: any[]) => x[0] == this.limpiarSpec2(item.spec));
    var id: any = parseInt(item.item);
    if (bisList) {
      var existe = false;
      existe = bisList.find((x: any[]) => x == id);
      if (!existe) {
        return 'red';
      } else {
        return 'black';
      }
    }
    return 'black';
  }

  cargarRutaDroptimizer() {
    const result = this.playersLibrary.filter((obj: { name: any; }) => obj.name === this.playerCargado);
    window.open(result[0].report, '_blank');
  }

  getBisList(spec: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.RaidbotsApiService.getBisList(spec).subscribe(
        (data) => {
          try {
            var idItems: any[] = [];
            var separator = 'WH.Gatherer.addData';
            data = data.split(separator);
            separator = 'qualityTier';
            data = data[2].split(separator);
            separator = '\"';
            var arrayItems: any[] = [];
            data.forEach((element: any) => {

              // Cada lista que esta incluida
              if (element.includes("helm")) {
                if (arrayItems.length > 1) {
                  idItems.push(arrayItems);
                }
                arrayItems = [];
              }

              var dato = element.split(separator);
              if (dato.length > 2) {
                var final: any;
                if (dato[2] == ':{') {
                  final = parseInt(dato[1].replace('"', ''));
                } else {
                  final = parseInt(dato[2].replace('"', ''));
                }
                arrayItems.push({ id: final, slot: this.verSlot(element) });
              }
            });

            idItems.push(arrayItems);
            resolve(this.estructurarItems(idItems, spec)); // Resolviendo la promesa con el resultado final
          } catch (error) {
            reject(error); // En caso de error
          }
        },
        (error) => {
          reject(error); // En caso de error en la suscripción
        }
      );
    });
  }

  estructurarItems(idItems: any, spec: any) {
    var itemList: any[] = [];
    idItems[0].forEach((element: any) => {
      var obj: any = this.itemsLibrary.find((x) => x.id === element.id);
      if (obj) {
        if (!itemList[element.slot]) {
          itemList[element.slot] = [];
        }
        var newObj = obj;
        newObj.overall = this.comprobarOverall(newObj, itemList[element.slot], element.slot);
        itemList[element.slot].push(newObj);
      } else {
        var newObj = element;
        newObj.overall = false;
        if (!itemList[newObj.slot]) {
          itemList[newObj.slot] = [];
        }
        itemList[newObj.slot].push(newObj);
      }
    });
    return itemList;
  }

  comprobarOverall(item: any, itemList: any, slot: any) {
    const filteredItems = itemList.filter((item: any) => 'overall' in item);
    if (slot == 'ring' || slot == 'trinket') {
      if (filteredItems.length > 1) {
        return false;
      }
    } else {
      if (filteredItems.length > 0) {
        return false;
      }
    }
    return true;
  }

  verSlot(item: any) {
    // Inicializa una variable para determinar el slot correspondiente
    let slot = 'trinket';

    if (item.includes("helm")) {
      slot = 'head';
    } else if (item.includes("neck")) {
      slot = 'neck';
    } else if (item.includes("shoulder")) {
      slot = 'shoulder';
    } else if (item.includes("cape")) {
      slot = 'back';
    } else if (item.includes("chest")) {
      slot = 'chest';
    } else if (item.includes("bracer")) {
      slot = 'wrist';
    } else if (item.includes("glove")) {
      slot = 'hands';
    } else if (item.includes("belt")) {
      slot = 'waist';
    } else if (item.includes("boot")) {
      slot = 'feet';
    } else if (item.includes("robe") || item.includes("pants") || item.includes("pant")) {
      slot = 'legs';
    } else if (item.includes("ring")) {
      slot = 'ring';
    } else if (item.includes("offhand")) {
      slot = 'off_hand';
    } else if ((item.includes("2h")) || (item.includes("1h"))) {
      slot = 'main_hand';
    }

    return slot;
  }

  getBisListData() {
    this.LocalDataService.getBisListTxt().subscribe((data => {
      var array = data.split(/\r?\n/);
      array = this.splitArrayByEmpty(array);
      this.allBisList = [];
      array.forEach((element: any) => {
        var elementArray = [this.limpiarSpec(element[0])];
        element.forEach((item: any) => {
          if (item = parseInt(item)) {
            elementArray.push(item);
          }
        });
        this.allBisList.push(elementArray);
      });
    }));
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

  limpiarSpec2(str: string): string {
    const words = str.split(" "); // Divide la cadena en palabras

    if (words.length > 2) {
      // Si hay más de 2 palabras, conservamos la primera y reemplazamos los espacios entre las demás por guiones
      const firstWord = words[0]; // Conservamos la primera palabra
      const remainingWords = words.slice(1).join("-"); // Unimos las palabras restantes con guiones
      return `${firstWord} ${remainingWords}`; // Devolvemos el string con la primera palabra seguida por las demás unidas con guiones
    }

    return str; // Si hay dos o menos palabras, devolvemos el string tal como está
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

  cargarTiersPlayer() {
    this.tierSlots = [];
    this.playersLibrary.forEach((element: any) => {
      var player = element.name;
      this.bossCargado = '';
      var titems: any[] = [];
      this.aitems.forEach((element: any) => {
        var telement: any[] = [];
        element[1].forEach((datos: any) => {
          var sim = datos.sim;
          var existe = sim.find((x: { name: any; }) => x.name.toLowerCase() == player.toLowerCase());
          if (existe) {
            telement.push(datos);
          }
        });
        var tslot = [element[0], telement];
        titems.push(tslot);
      });
      titems.forEach((slot: any) => {
        if ((slot[0] == 'head' || slot[0] == 'shoulder' || slot[0] == 'chest' || slot[0] == 'hands' || slot[0] == 'legs') && (slot[1].length > 0)) {
          var gearSims = slot[1];
          gearSims.forEach((item: any) => {
            if (item.armor == 'Tier') {
              this.tierSlots.push({
                name: player,
                armor: this.getArmor(element.spec, 'head'),
                tier: [{
                    slot: slot[0],
                    sim: item.sim
                }]
            });
            }
          });
        }
      });
    });
    this.aitems.forEach((slot: any) => { 
      if ((slot[0] === 'head' || slot[0] === 'shoulder' || slot[0] === 'chest' || slot[0] === 'hands' || slot[0] === 'legs') && (slot[1].length > 0)) {
        var gearSims = slot[1];
        gearSims.forEach((item: any) => {
          if (item.armor !== 'Tier') {
            item.sim = item.sim.map((sim: any) => this.catalyst(slot[0], sim));
          }
        });
      }
    });
  }

  catalyst(slot: any, sim: any) {
    var player = sim.name;
    const results = this.tierSlots.find((x: { name: any; }) => x.name.toLowerCase() === player.toLowerCase());
    const tierResults = results.tier.find((x: {slot : any; }) => x.slot === slot);
    var tierSim = tierResults.sim[0];
    var newSim = sim;
    if (tierSim.dps > sim.dps) {
      newSim.dps = tierSim.dps;
    }
    return newSim;
  }

}
