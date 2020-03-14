import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from "../api.service";
import {NgbTypeahead} from "@ng-bootstrap/ng-bootstrap";
import {merge, Observable, Subject} from "rxjs";
import {debounceTime, distinctUntilChanged, filter, map} from "rxjs/operators";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  private _buyAmountFiat = null;
  private rates = {};
  private currency = 'usd';
  private balance = null;

  @ViewChild('instance', {static: true}) instance: NgbTypeahead;
  focus$ = new Subject<string>();
  click$ = new Subject<string>();

  constructor(
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    try {
      const [rates, balance] = await Promise.all([
        this.apiService.getRates(),
        this.apiService.getBalance(),
      ]);
      this.rates = rates;
      this.balance = balance;
    } catch (err) {}
  }

  search = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.instance.isPopupOpen()));
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? this.currencies
        : this.currencies.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1)).slice(0, 10))
    );
  };

  get amountTooHigh() {
    if (this.balance === null) {
      return false;
    }

    return this.buyAmountBurst > this.balance;
  }

  get hasBurstBalance() {
    return this.balance !== null;
  }

  get burstBalanceFormatted() {
    return this.balance ? this.balance.toFixed(2) : 0;
  }

  get currencies() {
    return Object.keys(this.rates).map(currency => currency.toUpperCase());
  }

  get selectedCurrency() {
    return this.currency.toUpperCase();
  }

  set selectedCurrency(currency) {
    this.currency = currency;
  }

  get paypalMeLink() {
    return this.buyAmountFiat ? `https://paypal.me/foxycrypto/${this.buyAmountFiat.toFixed(2)}${this.selectedCurrency}` : 'https://paypal.me/foxycrypto';
  }

  get buyBurstButtonText() {
    return this.buyAmountBurst ? `Buy ≈ ${this.buyAmountBurst} BURST` : 'Buy BURST';
  }

  getRate(currency) {
    return this.rates[currency.toLowerCase()];
  }

  get currentRate() {
    return this.getRate(this.currency);
  }

  get buyAmountBurst() {
    const rate = this.currentRate;
    if (!rate || !this.buyAmountFiat) {
      return 0;
    }

    return (this.buyAmountFiat / rate).toFixed(2);
  }

  get buyAmountFiat(): number {
    return this._buyAmountFiat;
  }

  set buyAmountFiat(value: number) {
    this._buyAmountFiat = value;
  }
}
