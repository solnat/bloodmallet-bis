import * as React from "react";
import "whatwg-fetch";
import "./App.css";

export interface IAzeriteTrait {
  name: string;
  size: number;
  url: string;
  html_url: string;
  type: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export enum IClasses {
  PALADIN = "paladin",
  DK = "death_knight"
}

export enum ItemSlot {
  SHOULDER = "shoulder",
  HEAD = "head",
  CHEST = "chest"
}

export interface IBloodMalletItem {
  1_340: number;
  1_355: number;
  1_370: number;
  1_385: number;
}

export interface IBloodMalletAzeriteTraits {
  id: number;
  name: string;
  spell_id: number;
}

export interface IBloodMalletData {
  data: {
    [itemName: string]: IBloodMalletItem;
  };
  sorted_data_keys: string[];
  item_ids: {
    [itemName: string]: string;
  };
  used_azerite_traits_per_item: {
    [itemName: string]: IBloodMalletAzeriteTraits;
  };
}

export interface IAzeriteItem {
  name?: string;
  ranks?: IBloodMalletItem;
  slot: ItemSlot;
  id: string;
  azerite: string[];
  ilvl: number;
}

class State {
  items: IAzeriteItem[] = [];
  simcInput: string;
  className: string;
  characterName: string;
  spec: string;
  traits: IAzeriteTrait[] = [];
  rankings: any;
}

class App extends React.Component {
  githubAPi = "https://api.github.com/repos/Bloodmallet/bloodmallet.github.io/contents/json/azerite_traits";
  simc = "/test.txt";
  state: State = new State();

  componentDidMount() {
    fetch(this.simc)
      .then(res => res.text())
      .then(simcInput => this.parseSimcInput(simcInput));
  }

  parseSimcInput(simcInput: string) {
    const items = simcInput
      .split(/\r?\n/)
      .filter(line => line.includes("azerite_powers"))
      .map(line => this.parseItemLine(line));
    const classLine = simcInput.match(/^(\w+)="(\w+)"$/gm);
    const specLine = simcInput.match(/^spec=["]?(\w+)["]?/m);
    if (specLine && specLine[1]) {
      this.setState({ spec: specLine[1] });
    }
    if (classLine && classLine[0]) {
      const [className, characterName] = classLine[0].split("=");
      this.setState({ className, characterName });
    }
    this.setState({ items });
    console.log(items);
    this.fetchRankings(this.state.className, this.state.spec).then(res =>
      this.processRankings(res, this.state.items)
    );
  }

  processRankings(
    bmRanks: {
      head: IBloodMalletData;
      chest: IBloodMalletData;
      shoulders: IBloodMalletData;
    },
    items: IAzeriteItem[]
  ) {
    function process(ts: IAzeriteItem[], ranks: IBloodMalletData) {
      const ids = swapKv(ranks.item_ids);
      const itemData: IAzeriteItem[] = ts.map(i => ({
        ...i,
        name: ids[i.id]
      }));
      const results = itemData
        .map(item => ({
          ...item,
          ranks: item.name ? ranks.data[item.name] : null
        }))
        .sort((a: any, b: any) => (b.ranks["1_340"] - a.ranks["1_340"]) as any);
      return results;
    }

    const rankings = {
      [ItemSlot.CHEST]: process(
        items.filter(item => item.slot === ItemSlot.CHEST),
        bmRanks.chest
      ),
      [ItemSlot.SHOULDER]: process(
        items.filter(item => item.slot === ItemSlot.SHOULDER),
        bmRanks.shoulders
      ),
      [ItemSlot.HEAD]: process(
        items.filter(item => item.slot === ItemSlot.HEAD),
        bmRanks.head
      )
    };
    console.log(rankings);
    this.setState({ rankings });
    return rankings;
  }

  parseItemLine(itemLine: string): IAzeriteItem | null {
    const regex = /(\w+)=["]?,id=(\d+)(?:.+)bonus_id=(.*),reforge=(:?.*)azerite_powers=/;
    const matches = itemLine.match(regex);
    console.log(itemLine, matches);
    if (!matches) {
      return null;
    }
    const [slot, id, ilvl]: [ItemSlot, string, number] = [
      matches[1] as ItemSlot,
      matches[2],
      matches[3].split("/").reverse()[1] as any
    ];
    console.log(slot, id, ilvl);
    return {
      slot,
      id,
      ilvl: 340
    } as IAzeriteItem;
  }

  fetchRankings(className: string, spec: string) {
    const urls = ["head", "chest", "shoulders"].map(
      slot =>
        `https://raw.githubusercontent.com/Bloodmallet/bloodmallet.github.io/master/json/azerite_traits/${className}_${spec}_${slot}_patchwerk.json`
    );
    return Promise.all(
      urls.map(url => fetch(url).then(res => res.json()))
    ).then(([head, chest, shoulders]) => ({ head, chest, shoulders }));
  }

  render() {
    const rankings = Object.keys(ItemSlot);
    console.log(rankings);
    return (
      <div className="App">
        {this.state.rankings &&
          rankings.map(slot => (
            <div key={slot}>
              {slot}
              {this.state.rankings[ItemSlot[slot]].map(
                (items: any, idx: number) => (
                  <ItemRow key={idx} ranks={items} first={idx === 0} />
                )
              )}
            </div>
          ))}
        <div>
          {this.state.className} {this.state.characterName} {this.state.spec}{" "}
        </div>
        <ul>
          {this.state.items.map((item, idx) => (
            <li key={idx}>
              {item.id} {item.slot} {item.ilvl}
            </li>
          ))}
        </ul>
        <ul>
          {this.state.traits.map(trait => (
            <li key={trait.name}>{trait.name}</li>
          ))}
        </ul>
      </div>
    );
  }
}

class ItemRow extends React.PureComponent {
  props: {
    ranks: IAzeriteItem;
    first: boolean;
  };
  render() {
    console.log(this.props.ranks);
    return (
      <div className={this.props.first ? "first" : ""}>
        <div>{this.props.ranks.name}</div>
        {this.props.ranks.ranks && (
          <ul>
            <li>340: {this.props.ranks.ranks["1_340"]}</li>
            <li>355: {this.props.ranks.ranks["1_355"]}</li>
            <li>370: {this.props.ranks.ranks["1_370"]}</li>
            <li>385: {this.props.ranks.ranks["1_385"]}</li>
          </ul>
        )}
      </div>
    );
  }
}

function swapKv(json: any) {
  // tslint:disable
  const ret = {};
  for (let key in json) {
    ret[json[key]] = key;
  }
  return ret;
}

export default App;
