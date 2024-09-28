import { Component, OnChanges, OnInit, SimpleChanges, ViewChildren } from '@angular/core';
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
  listSlots = [ 'head','neck','shoulder','back', 'chest','wrist','hands','waist','legs','feet','finger','trinket','main_hand','off_hand'];
  aitems: any[] = [];
  fitems: any[] = [];
  base_url = 'https://www.raidbots.com/simbot/report/';
  reports: string[] = [];
  listBosses: any[] = [];
  itemsLibrary: ItemsLibrary [] = [];
  PH_image = 'https://wow.zamimg.com/images/wow/icons/large/inv_10_jewelcrafting_gem3primal_fire_cut_blue.jpg';
  base_img = 'https://wow.zamimg.com/images/wow/icons/large/';
  encounterLibrary: Boss [] = [];
  playersLibrary: any = [];
  actualIlvl: number = 0;
  @ViewChildren('myselect') select: any; 
  YOUR_AUTHORIZATION_CODE = 'kXnSmYA60XPENHCp83XlLNY3fwOojI';

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
    this.LocalDataService.getDroptimizers().subscribe((data: any) => {
      var str = data.split("\r");
      str.forEach((element: any) => {
        var elementArray = element.split("Raidbots");
        element = elementArray[0];
        this.getReports(element);
      });
      this.reports.forEach((report: any) => {    
        this.RaidbotsApiService.getDroptimizer(report).subscribe((data) => {
          if (this.encounterLibrary.length == 0) {
            this.getBossLibrary(data);
          }
          this.addPlayer(data);
          this.getItemsLibrary(data);
          this.getDroptimizer(data);
        });
      });
    });
  }

  addPlayer(data: any) {
    var player = data.sim.players[0].name;
    var existe = this.playersLibrary.find((x: any) => x.name == player);
    var gear = data.sim.players[0].gear;
    var ilvl = this.calcularIlvl(gear);
    if (!existe) {
      this.playersLibrary.push({name: player, ilvl: ilvl});
    } else {
      var existeIlvl = existe.ilvl;
      if (ilvl > existeIlvl) {
        this.playersLibrary.find((x: any) => x.name == player).ilvl = ilvl;
      }
    }
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
    bosses.forEach((element: any)=> {
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
    if (slot[1] && slot[1]=='') {
      return false;
    }
    return true;
  }

  getItem(item: any, player: any) {
    var str = item.name.split("/",7);
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
      var allItems = this.items [item_slot as ObjectKey];
      

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

  getCharOptions() {
    var barChartOptions = {
      plugins: {
          legend: {
              display: false,
          },
      },
    };

    return barChartOptions;
  }

  generateColor(spec: any) {
    if (spec == 'Devastation Evoker') {
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
    if (spec == 'Windwalker Monk' || spec == 'Breawmaster Monk') {
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
    if (spec == 'Devastation Evoker') {
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
    if (spec == 'Windwalker Monk' || spec == 'Breawmaster Monk') {
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
    if (spec == 'Devastation Evoker') {
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
    if (spec == 'Windwalker Monk' || spec == 'Breawmaster Monk') {
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
    this.actualIlvl = 0;
    var boss = data.target.value;
    if (boss) {
      //this.fitems = this.aitems;
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
          titems.push([element[0],tslot]);
        }
      });
      this.fitems = titems;
    } else {
      this.fitems = this.aitems;
    }
  }

  filtrar2(data: any) {
    this.actualIlvl = 0;
    var slot = data.target.value;
    if (slot) {
      //this.fitems = this.aitems;
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
      //this.fitems = this.aitems;
      var titems: any[] = [];
      this.fitems.forEach((element: any) => {
        var telement: any[] = [];
        element[1].forEach((datos: any) => {
          var sim = datos.sim;
          var existe = sim.find((x: { name: any; }) => x.name == player);
          if (existe) {
            telement.push(datos); 
          }
        });
        var tslot = [element[0], telement];
        titems.push(tslot);
      });
      this.fitems = titems;
      this.cargarActualIlvl(player);
    } else {
      this.actualIlvl = 0;
      this.fitems = this.aitems;
    }
  }

  filtrar4(data: any) {
    var dps = parseInt(data.target.value);
    if (data) {
      //this.fitems = this.aitems;
      var titems: any[] = [];
      this.fitems.forEach((element: any) => {
        var telement: any[] = [];
        element[1].forEach((datos: any) => {
          var sim = datos.sim;
          var existe = sim.find((x: { dps: number; }) => x.dps >= dps );
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
  }

  cargarActualIlvl(player: any) {
    var obj = this.playersLibrary.find((x: { name: any; }) => x.name == player);
    this.actualIlvl = obj.ilvl;
  }

  comprobarCatalyst(data : any) {
    var totalArray: any[] = [];
    data.forEach((element: any) => {
      var tempArray: any[] = [];
      if (this.comprobarSlotCatalyst(element[0])){
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
      totalArray.push([element[0],tempArray]);
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
}
