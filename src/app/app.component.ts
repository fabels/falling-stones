import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { slideInDownOnEnterAnimation, zoomInOnEnterAnimation } from 'angular-animations';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    slideInDownOnEnterAnimation({ duration: 250 }),
    zoomInOnEnterAnimation({ duration: 250 })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {

  gamefield = new BehaviorSubject<Stone[]>([]);
  blockSize = 60;
  blockMargin = 1;
  blockBorderWidth = 0;
  points = 0;
  gameover = false;

  private _gamefield!: Stone[];
  private cols = 5;
  private rows = 5;
  private mergeLimit = 50;
  private colors = {
    yellow: '#DBE000',
    green: '#32E070',
    grey: '#888E94',
    blue: '#45B6DE',
    free: 'black'
  };

  ngOnInit(): void {
    this.startGame();
    this.subscribeToRenderEvents();
  }

  getGamefieldWidth(): number {
    return this.cols * this.getBlockSize();
  }

  getGamefieldHeight(): number {
    return this.rows * this.getBlockSize();
  }

  getBorderRadius(stone: Stone): string {
    let borderRadiusTopLeft = '15%', borderRadiusTopRight = '15%', borderRadiusBottomRight = '15%', borderRadiusBottomLeft = '15%';
    const stones = this.getLinkedStones(stone);

    if (stones && stones.length > 2) {
      if (this.sameColor(this.stoneTop(stone), stone)) borderRadiusTopRight = borderRadiusTopLeft = '0%';
      if (this.sameColor(this.stoneRight(stone), stone)) borderRadiusTopRight = borderRadiusBottomRight = '0%';
      if (this.sameColor(this.stoneBottom(stone), stone)) borderRadiusBottomRight = borderRadiusBottomLeft = '0%';
      if (this.sameColor(this.stoneLeft(stone), stone)) borderRadiusBottomLeft = borderRadiusTopLeft = '0%';
    }

    return `${borderRadiusTopLeft} ${borderRadiusTopRight} ${borderRadiusBottomRight} ${borderRadiusBottomLeft}`;
  }

  startGame(): void {
    this.gameover = false;
    this._gamefield = this.createGamefield();
    this.render();
  }

  isFalling(stone: Stone): boolean {
    return stone.animation === Animation.fall;
  }

  isSpawning(stone: Stone): boolean {
    return stone.animation === Animation.spawn;
  }

  isPresent(stone: Stone): boolean {
    return stone.animation === Animation.present;
  }

  stoneClicked(stone: Stone): void {
    const linkedStones = this.getLinkedStones(stone);
    const notEnoughStonesLinkes = linkedStones && linkedStones?.length < 2;
    if (notEnoughStonesLinkes) {
      return;
    }

    const isMergedStone = stone.points === this.mergeLimit;
    if (isMergedStone) {
      this.mergedStoneClicked(linkedStones || []);
      return;
    }

    const index = this._gamefield.findIndex(s => s === stone);
    const points = linkedStones?.map(s => s.points)?.reduce((s1, s2) => s1 + s2, 0) || 0;
    this.points += points;
    this._gamefield[index] = { ...stone, points };

    linkedStones?.filter(s => s !== stone)
      .forEach(s => s.color = this.colors.free);

    this.render();
    this.checkForMerge();
  }

  private subscribeToRenderEvents(): void {
    this.gamefield.subscribe(gamefield => {
      for (let i = 0; i < gamefield.length; i++) {
        if ((this.getLinkedStones(gamefield[i])?.length || 0) > 2) {
          return;
        }
      }
      this.gameover = true;
    });
  }

  private render(): void {
    this.fallingStones();
    this.gamefield.next(this._gamefield);
    setTimeout(() => {
      this.fillUpGamefield();
      this.gamefield.next(this._gamefield);
      setTimeout(() => this._gamefield.forEach(s => s.animation = Animation.present), 250);
    }, 250);
  }

  private mergedStoneClicked(linkedStones: Stone[]): void {
    this.points += linkedStones.length * this.mergeLimit;
    linkedStones.forEach(s => s.color = this.colors.free);
    this.render();
  }

  private fillUpGamefield(): void {
    this._gamefield = this._gamefield.map(s => s.color === this.colors.free ? ({ color: this.getRandomColor(), points: 1, animation: Animation.spawn }) : s);
  }

  private checkForMerge(): void {
    this._gamefield = this._gamefield.map(s => s.points >= this.mergeLimit ? ({ color: this.colors.blue, points: this.mergeLimit, animation: Animation.present }) : s);
  }

  private fallingStones(): void {
    for (let i = this._gamefield.length; i > 0; i--) {
      const currentStone = this._gamefield[i];
      if (currentStone?.color === this.colors.free) {
        let top = this.stoneTop(currentStone);
        while (top) {
          if (top.color !== this.colors.free) {
            const indexTop = this._gamefield.findIndex(s => s === top);
            this._gamefield[i] = { ...top, animation: Animation.fall };
            this._gamefield[indexTop] = { ...top, color: this.colors.free };
          }
          top = this.stoneTop(top);
        }
      }
    }
  }

  private getLinkedStones(stone: Stone, linkedStones?: Stone[]): Stone[] | undefined {
    const localLinkedStones = linkedStones ? linkedStones : [];
    const stoneAllreadyChecked = localLinkedStones.find(s => s === stone);

    if (!!stoneAllreadyChecked) {
      return;
    }

    localLinkedStones.push(stone);

    const stoneTop = this.stoneTop(stone);
    if (stoneTop && this.sameColor(stone, stoneTop)) {
      this.getLinkedStones(stoneTop, localLinkedStones);
    }

    const stoneRight = this.stoneRight(stone);
    if (stoneRight && this.sameColor(stone, stoneRight)) {
      this.getLinkedStones(stoneRight, localLinkedStones);
    }

    const stoneBottom = this.stoneBottom(stone);
    if (stoneBottom && this.sameColor(stone, stoneBottom)) {
      this.getLinkedStones(stoneBottom, localLinkedStones);
    }

    const stoneLeft = this.stoneLeft(stone);
    if (stoneLeft && this.sameColor(stone, stoneLeft)) {
      this.getLinkedStones(stoneLeft, localLinkedStones);
    }

    return localLinkedStones;
  }

  private stoneTop(stone: Stone): Stone | undefined {
    const index = this._gamefield.findIndex(s => s === stone);
    const row = Math.floor(index / this.rows);
    return row > 0 ? this._gamefield[index - this.cols] : undefined;
  }

  private stoneBottom(stone: Stone): Stone | undefined {
    const index = this._gamefield.findIndex(s => s === stone);
    const row = Math.floor(index / this.rows);
    return row < this.rows ? this._gamefield[index + this.cols] : undefined;
  }

  private stoneLeft(stone: Stone): Stone | undefined {
    const index = this._gamefield.findIndex(s => s === stone);
    const row = Math.floor(index / this.rows);
    const col = index - row * this.cols;
    return col > 0 ? this._gamefield[index - 1] : undefined;
  }

  private stoneRight(stone: Stone): Stone | undefined {
    const index = this._gamefield.findIndex(s => s === stone);
    const row = Math.floor(index / this.rows);
    const col = index - row * this.cols;
    return col < this.cols - 1 ? this._gamefield[index + 1] : undefined;
  }

  private sameColor(s1?: Stone, s2?: Stone): boolean {
    return s1?.color === s2?.color;
  }

  private createGamefield(): Stone[] {
    const gamefield: Stone[] = [];
    let i = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const color = this.getRandomColor();
        const points = 1;
        const animation = Animation.present;
        gamefield[i] = { color, points, animation } as Stone;
        i++;
      }
    }
    return gamefield;
  }

  private getRandomColor(): string {
    const number = Math.random();
    if (number <= 0.3) {
      return this.colors.green;
    }
    if (number > 0.3 && number <= 0.6) {
      return this.colors.grey;
    }
    return this.colors.yellow;
  }

  private getBlockSize(): number {
    return this.blockSize + (this.blockMargin * 2) + (this.blockBorderWidth * 2)
  }

}

interface Stone {
  color: string;
  points: number;
  animation: Animation;
}

enum Animation {
  present,
  spawn,
  fall
}