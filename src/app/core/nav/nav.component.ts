import {Component, OnInit, Input} from '@angular/core';
import {Menu} from './menu';
import {Language} from '../language-selector/language';
import {JsonFileService} from '../services/json-file.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent implements OnInit {
  @Input() items: Menu[];

  constructor(private jsonService: JsonFileService) {
  }

  ngOnInit() {
    if (!this.items || this.items.length === 0) {
      this.jsonService.getData('assets/data/menu.json').subscribe(data => {
        this.items = data;
      });
    }
  }
}
