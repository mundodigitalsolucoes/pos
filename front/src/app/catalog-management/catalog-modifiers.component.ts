import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar.component';

interface ProductRow { id?: number; name: string; category?: string; }
interface ModifierOption { id: number; group_id: number; name: string; price_delta_cents: number; sort_order: number; is_active: boolean; }
interface ModifierGroup { id: number; name: string; min_select: number; max_select: number; is_required: boolean; sort_order: number; is_active: boolean; options: ModifierOption[]; product_ids: number[]; }

@Component({
  selector: 'app-catalog-modifiers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent],
  template: `
    <app-sidebar>
      <main class="page">
        <header class="page-head">
          <div>
            <p class="eyebrow">Cardápio</p>
            <h1>Catálogo</h1>
            <p>Crie grupos reutilizáveis, defina regras de escolha e associe o mesmo grupo a vários produtos.</p>
          </div>
          <a routerLink="/products" class="btn secondary">Voltar ao Cardápio</a>
        </header>

        <nav class="catalog-tabs" aria-label="Seções do catálogo">
          <a routerLink="/products">Produtos</a>
          <a routerLink="/cardapio/complementos" [class.active]="view() === 'groups'">Complementos</a>
          <a routerLink="/cardapio/complementos" [queryParams]="{view:'options'}" [class.active]="view() === 'options'">Opções</a>
        </nav>

        @if (view() === 'groups') {
        <section class="create-card">
          <div>
            <h2>Novo grupo de complementos</h2>
            <p>Ex.: Bordas, Adicionais, Molhos, Escolha de acompanhamento.</p>
          </div>
          <div class="create-grid">
            <input [(ngModel)]="newGroupName" maxlength="128" placeholder="Nome do grupo" />
            <label>Mínimo <input type="number" min="0" [(ngModel)]="newMin" /></label>
            <label>Máximo <input type="number" min="1" [(ngModel)]="newMax" /></label>
            <label class="check"><input type="checkbox" [(ngModel)]="newRequired" /> Obrigatório</label>
            <button type="button" class="btn primary" (click)="createGroup()" [disabled]="saving() || !newGroupName.trim()">+ Criar grupo</button>
          </div>
        </section>
        }

        @if (error()) { <div class="message error">{{ error() }}</div> }
        @if (loading()) {
          <div class="empty">Carregando complementos…</div>
        } @else if (groups().length === 0) {
          <div class="empty"><strong>Nenhum grupo cadastrado.</strong><span>Crie o primeiro grupo acima.</span></div>
        } @else {
          <section class="groups">
            @for (group of groups(); track group.id) {
              <article class="group-card" [class.inactive]="!group.is_active">
                @if (view() === 'groups') { <div class="group-head">
                  <div>
                    <div class="title-row">
                      <input class="group-name" [(ngModel)]="group.name" maxlength="128" />
                      <label class="status"><input type="checkbox" [(ngModel)]="group.is_active" /> Ativo</label>
                    </div>
                    <div class="rules">
                      <label>Mínimo <input type="number" min="0" [(ngModel)]="group.min_select" /></label>
                      <label>Máximo <input type="number" min="1" [(ngModel)]="group.max_select" /></label>
                      <label class="check"><input type="checkbox" [(ngModel)]="group.is_required" /> Obrigatório</label>
                    </div>
                  </div>
                  <div class="actions">
                    <button class="btn secondary" type="button" (click)="saveGroup(group)" [disabled]="saving()">Salvar regras</button>
                    <button class="text danger" type="button" (click)="deleteGroup(group)" [disabled]="saving()">Excluir</button>
                  </div>
                </div> } @else { <div class="section-head"><h2>{{ group.name }}</h2><span>{{ group.options.length }} opções</span></div> }

                <div class="columns">
                  <section>
                    <div class="section-head"><h3>Opções</h3><span>{{ group.options.length }}</span></div>
                    <div class="new-option">
                      <input #optionName placeholder="Nova opção" maxlength="128" />
                      <input #optionPrice type="number" min="0" step="0.01" placeholder="+ R$" />
                      <button type="button" class="btn compact" (click)="addOption(group, optionName.value, optionPrice.value); optionName.value=''; optionPrice.value=''">Adicionar</button>
                    </div>
                    @if (group.options.length === 0) {
                      <p class="muted">Nenhuma opção cadastrada.</p>
                    } @else {
                      <div class="option-list">
                        @for (option of group.options; track option.id) {
                          <div class="option-row">
                            <input [(ngModel)]="option.name" maxlength="128" />
                            <div class="money"><span>R$</span><input type="number" min="0" step="0.01" [ngModel]="centsToValue(option.price_delta_cents)" (ngModelChange)="option.price_delta_cents = valueToCents($event)" /></div>
                            <label class="status small"><input type="checkbox" [(ngModel)]="option.is_active" /> Ativa</label>
                            <button type="button" class="text" (click)="saveOption(group, option)">Salvar</button>
                            <button type="button" class="text danger" (click)="deleteOption(group, option)">Excluir</button>
                          </div>
                        }
                      </div>
                    }
                  </section>

                  @if (view() === 'groups') { <section>
                    <div class="section-head"><h3>Produtos vinculados</h3><span>{{ group.product_ids.length }}</span></div>
                    <p class="muted">Marque os produtos que reutilizam este grupo.</p>
                    <div class="product-list">
                      @for (product of products(); track product.id) {
                        @if (product.id) {
                          <label class="product-check">
                            <input type="checkbox" [checked]="group.product_ids.includes(product.id)" (change)="toggleProduct(group, product.id, $event)" />
                            <span><strong>{{ product.name }}</strong><small>{{ product.category || 'Sem categoria' }}</small></span>
                          </label>
                        }
                      }
                    </div>
                    <button type="button" class="btn secondary save-products" (click)="saveProducts(group)" [disabled]="saving()">Salvar vínculos</button>
                  </section> }
                </div>
              </article>
            }
          </section>
        }
      </main>
    </app-sidebar>
  `,
  styles: [`
    .catalog-tabs{display:flex;gap:18px;border-bottom:1px solid #dfe2e9;margin-bottom:16px}.catalog-tabs a{padding:10px 2px;color:#697187;text-decoration:none;font-weight:700;font-size:.83rem}.catalog-tabs a.active{color:#374B89;border-bottom:2px solid #D6A92F}
    .group-card:has(.section-head h2) .columns{grid-template-columns:1fr}.group-card:has(.section-head h2) .option-row{grid-template-columns:minmax(140px,1fr) 120px 80px auto auto}
    .page{max-width:1240px;margin:0 auto;padding:2rem}.page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem}.eyebrow{margin:0 0 .25rem;color:#D6A92F;font-size:.76rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}h1{margin:0;color:#2F3453;font-size:clamp(1.9rem,4vw,2.4rem)}.page-head p:last-child,.create-card p,.muted{color:#667085}.create-card,.group-card{background:#fff;border:1px solid rgba(47,52,83,.12);border-radius:16px;box-shadow:0 10px 28px rgba(47,52,83,.05)}.create-card{padding:1.1rem 1.25rem;margin-bottom:1rem}.create-card h2,.section-head h3{margin:0;color:#2F3453}.create-grid{display:grid;grid-template-columns:minmax(220px,1fr) 110px 110px 130px auto;gap:.6rem;align-items:end;margin-top:1rem}input{min-height:40px;border:1px solid #d7dbe6;border-radius:9px;padding:.55rem .65rem;font:inherit;box-sizing:border-box}label{font-size:.82rem;color:#475467;display:flex;flex-direction:column;gap:.25rem}.check,.status{flex-direction:row;align-items:center;gap:.45rem;min-height:40px}.check input,.status input,.product-check input{min-height:auto}.btn{min-height:40px;padding:.58rem .85rem;border-radius:9px;font:inherit;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.btn.primary{background:#374B89;color:#fff;border:1px solid #374B89}.btn.secondary,.btn.compact{background:#fff;color:#374B89;border:1px solid rgba(55,75,137,.35)}.btn.compact{min-height:36px}.groups{display:grid;gap:1rem}.group-card{padding:1.1rem}.group-card.inactive{opacity:.68}.group-head{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgba(47,52,83,.1);padding-bottom:1rem}.title-row,.rules,.actions,.section-head,.new-option,.option-row{display:flex;align-items:center;gap:.6rem}.group-name{font-size:1.05rem;font-weight:800;color:#2F3453;min-width:280px}.rules{margin-top:.65rem}.rules label{width:110px}.actions{align-self:flex-start}.text{border:0;background:transparent;color:#374B89;font:inherit;font-size:.84rem;font-weight:700;cursor:pointer}.text.danger{color:#b42318}.columns{display:grid;grid-template-columns:1.1fr .9fr;gap:1.25rem;padding-top:1rem}.section-head{justify-content:space-between}.section-head span{background:#f2f4f7;color:#475467;border-radius:999px;padding:.25rem .5rem;font-size:.76rem;font-weight:700}.new-option{margin:.75rem 0}.new-option input:first-child{flex:1}.new-option input:nth-child(2){width:110px}.option-list{display:grid;gap:.5rem}.option-row{display:grid;grid-template-columns:minmax(140px,1fr) 120px 80px auto auto}.money{display:flex;align-items:center;border:1px solid #d7dbe6;border-radius:9px;padding-left:.45rem}.money input{border:0;width:86px}.status.small{font-size:.76rem}.product-list{max-height:280px;overflow:auto;border:1px solid #eaecf0;border-radius:10px;margin-top:.6rem}.product-check{display:flex;flex-direction:row;align-items:center;padding:.65rem .75rem;border-bottom:1px solid #f2f4f7}.product-check:last-child{border-bottom:0}.product-check span{display:flex;flex-direction:column}.product-check small{color:#98a2b3}.save-products{margin-top:.75rem}.message{padding:.75rem 1rem;border-radius:10px;margin-bottom:1rem}.message.error{background:#fff1f0;color:#b42318;border:1px solid #ffd0cc}.empty{padding:2rem;text-align:center;color:#667085;background:#fff;border:1px dashed #d0d5dd;border-radius:14px;display:flex;flex-direction:column;gap:.3rem}
    @media(max-width:900px){.create-grid{grid-template-columns:1fr 1fr}.create-grid>input:first-child,.create-grid>.btn{grid-column:1/-1}.columns{grid-template-columns:1fr}.group-head{flex-direction:column}.actions{align-self:stretch}.option-row{grid-template-columns:1fr 120px}.option-row .status,.option-row .text{justify-self:start}.page{padding:1rem}.page-head{flex-direction:column}.group-name{min-width:0;width:100%}.title-row{align-items:stretch;flex-direction:column}}
  `]
})
export class CatalogModifiersComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly view = signal<'groups' | 'options'>('groups');
  private readonly http = inject(HttpClient);
  private readonly apiBase = String((window as Window & { __API_URL__?: string }).__API_URL__ || '/api').replace(/\/$/, '');
  readonly groups = signal<ModifierGroup[]>([]);
  readonly products = signal<ProductRow[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  newGroupName=''; newMin=0; newMax=1; newRequired=false;

  ngOnInit(): void { this.route.queryParamMap.subscribe(params => this.view.set(params.get('view') === 'options' ? 'options' : 'groups')); this.load(); }
  private endpoint(s=''){ return `${this.apiBase}/tenant/subcategories/modifier-groups${s}`; }
  load(): void {
    this.loading.set(true); this.error.set(null);
    this.http.get<ModifierGroup[]>(this.endpoint(), {withCredentials:true}).subscribe({next: g=>{this.groups.set(g);this.loading.set(false)},error:e=>{this.fail(e,'Não foi possível carregar os complementos.');this.loading.set(false)}});
    this.http.get<ProductRow[]>(`${this.apiBase}/products`, {withCredentials:true}).subscribe({next:p=>this.products.set(p),error:()=>this.products.set([])});
  }
  createGroup(): void {
    if(!this.newGroupName.trim())return; this.saving.set(true);
    this.http.post(this.endpoint(),{name:this.newGroupName.trim(),min_select:this.newMin,max_select:this.newMax,is_required:this.newRequired,sort_order:this.groups().length*10},{withCredentials:true}).subscribe({next:()=>{this.newGroupName='';this.newMin=0;this.newMax=1;this.newRequired=false;this.saving.set(false);this.load()},error:e=>{this.fail(e,'Não foi possível criar o grupo.');this.saving.set(false)}});
  }
  saveGroup(group:ModifierGroup):void{this.saving.set(true);this.http.put(this.endpoint(`/${group.id}`),{name:group.name,min_select:group.min_select,max_select:group.max_select,is_required:group.is_required,is_active:group.is_active,sort_order:group.sort_order},{withCredentials:true}).subscribe({next:()=>{this.saving.set(false);this.load()},error:e=>{this.fail(e,'Não foi possível salvar o grupo.');this.saving.set(false)}})}
  deleteGroup(group:ModifierGroup):void{if(!confirm(`Excluir “${group.name}” e suas opções?`))return;this.saving.set(true);this.http.delete(this.endpoint(`/${group.id}`),{withCredentials:true}).subscribe({next:()=>{this.saving.set(false);this.load()},error:e=>{this.fail(e,'Não foi possível excluir o grupo.');this.saving.set(false)}})}
  addOption(group:ModifierGroup,name:string,price:string):void{const n=name.trim();if(!n)return;this.saving.set(true);this.http.post(this.endpoint(`/${group.id}/options`),{name:n,price_delta_cents:this.valueToCents(price),sort_order:group.options.length*10},{withCredentials:true}).subscribe({next:()=>{this.saving.set(false);this.load()},error:e=>{this.fail(e,'Não foi possível adicionar a opção.');this.saving.set(false)}})}
  saveOption(group:ModifierGroup,option:ModifierOption):void{this.saving.set(true);this.http.put(this.endpoint(`/${group.id}/options/${option.id}`),{name:option.name,price_delta_cents:option.price_delta_cents,is_active:option.is_active,sort_order:option.sort_order},{withCredentials:true}).subscribe({next:()=>{this.saving.set(false);this.load()},error:e=>{this.fail(e,'Não foi possível salvar a opção.');this.saving.set(false)}})}
  deleteOption(group:ModifierGroup,option:ModifierOption):void{if(!confirm(`Excluir a opção “${option.name}”?`))return;this.saving.set(true);this.http.delete(this.endpoint(`/${group.id}/options/${option.id}`),{withCredentials:true}).subscribe({next:()=>{this.saving.set(false);this.load()},error:e=>{this.fail(e,'Não foi possível excluir a opção.');this.saving.set(false)}})}
  toggleProduct(group:ModifierGroup,productId:number,event:Event):void{const checked=(event.target as HTMLInputElement).checked;group.product_ids=checked?[...new Set([...group.product_ids,productId])]:group.product_ids.filter(id=>id!==productId)}
  saveProducts(group:ModifierGroup):void{this.saving.set(true);this.http.put(this.endpoint(`/${group.id}/products`),{product_ids:group.product_ids},{withCredentials:true}).subscribe({next:()=>{this.saving.set(false);this.load()},error:e=>{this.fail(e,'Não foi possível salvar os vínculos.');this.saving.set(false)}})}
  centsToValue(cents:number):number{return Math.max(0,cents||0)/100}
  valueToCents(value:unknown):number{const n=Number(String(value??'').replace(',','.'));return Number.isFinite(n)?Math.max(0,Math.round(n*100)):0}
  private fail(err:any,fallback:string):void{this.error.set(err?.error?.detail||fallback)}
}
