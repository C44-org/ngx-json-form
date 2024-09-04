import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms'
import { Observable, catchError, forkJoin, map, of, take, tap } from 'rxjs'
import { GenericControl, Options } from './models/generic-control'
import { SelectDropdownConfig } from './models/select-dropdown.model'
import { ExtendedFileModel } from './models/extendedfile.model'
import { JsonFormService } from './services/json-form.service'
import { FileuploadService } from './services/fileupload.service'
import { CustomValidator } from './validators/customvalidators'
import { flatten, getLocalISO } from './utils/json-form-utils'
import { HttpEventType } from '@angular/common/http'
import { CommonModule } from '@angular/common'
import { MaskDirective } from './directives/mask/mask.directive'
import { IndexOfObjectValuePipe } from './pipes/indexOfObjektValue/index-of-object-value.pipe'
import { ImageThumbnailComponent } from './components/image-thumbnail/image-thumbnail.component'
import { SanitizePipe } from './pipes/sanitize/sanitize.pipe'
import { ToggleComponent } from './components/toggle/toggle.component'
import { MatSelectModule } from '@angular/material/select'
import { SelectDropdownComponent } from './components/select-dropdown/select-dropdown.component'
import { HiddenDirective } from './directives/hidden/hidden.directive'
import { SignatureComponent } from './components/signature/signature.component'
import { FileuploadComponent } from './components/fileupload/fileupload.component'
import { DateFieldComponent } from './components/date-field/date-field.component'
// import { AutofocusDirective } from './directives/autofocus/autofocus.directive'
import { OneTimePadComponent } from './components/one-time-pad/one-time-pad.component'
import { PinComponent } from './components/pin/pin.component'

@Component({
  selector: 'json-form',
  standalone: true,
  imports: [
    // AutofocusDirective,
    CommonModule,
    DateFieldComponent,
    FormsModule,
    FileuploadComponent,
    HiddenDirective,
    IndexOfObjectValuePipe,
    ImageThumbnailComponent,
    MaskDirective,
    MatSelectModule,
    OneTimePadComponent,
    PinComponent,
    ReactiveFormsModule,
    SanitizePipe,
    SelectDropdownComponent,
    SignatureComponent,
    ToggleComponent
  ],
  templateUrl: './ngx-json-form.component.html',
  styleUrls: ['./ngx-json-form.component.sass']
})
export class NgxJsonFormComponent {
  @Input() formContent!: GenericControl[]
  @Output() formValue: EventEmitter<any> = new EventEmitter<any>()
  @Output() formStatus: EventEmitter<any> = new EventEmitter<any>()
  
  dynamicForm!: FormGroup
  value: any
  loading: boolean = false
  status: any

  // selectoptions
  selectfields: any[] = []

  // dependedselect
  dependedSelectfields: any[] = []
  dependedKeys: any[] = []
  rules: any[] = []

  // searchselect
  config: SelectDropdownConfig = {
    displayKey: "name",
    search: true,
    limitTo: 0,
    height: "250px",
    enableSelectAll: true,
    placeholder: "Test",
    searchOnKey: "",
    moreText: "more",
    noResultsFound: "No results found!",
    searchPlaceholder: 'Search',
    clearOnSelection: false,
    inputDirection: 'ltr',
  }
  options = [
    {
      _id: "5a66d6c31d5e4e36c7711b7a",
      index: 0,
      balance: "$2,806.37",
      picture: "http://placehold.it/32x32",
      name: "Burns Dalton"
    },
    {
      _id: "5a66d6c3657e60c6073a2d22",
      index: 1,
      balance: "$2,984.98",
      picture: "http://placehold.it/32x32",
      name: "Mcintyre Lawson"
    },
    {
      _id: "5a66d6c376be165a5a7fae33",
      index: 2,
      balance: "$2,794.16",
      picture: "http://placehold.it/32x32",
      name: "Amie Franklin"
    },
    {
      _id: "5a66d6c376be165a5a7fae34",
      index: 2,
      balance: "$3,794.16",
      picture: "http://placehold.it/32x32",
      name: "Amie Palmer"
    },
    {
      _id: "5a66d6c376be165a5a7fae37",
      index: 2,
      balance: "$4,794.16",
      picture: "http://placehold.it/32x32",
      name: "Amie Andrews"
    }
  ]
  resetOption: any
  
  constructor(private _jsonFormService: JsonFormService, private _fileuploadService: FileuploadService) {}

  ngOnInit(): void {
    // dynamic reactive form
    this.dynamicForm = new FormGroup(
      this.formContent.reduce((mo: {}, fieldDesc: any) => {
        // default values
        let value: string | boolean | undefined = fieldDesc.defaultValue
        // if (fieldDesc.type == 'input') {
        //   // console.log('input', fieldDesc)
        //   if (fieldDesc.type == 'input' && fieldDesc.hasOwnProperty('dependOnKey')) console.log('input!!!', fieldDesc, )
        // }
        // seperate selectoptions
        if (fieldDesc.type == 'select') {
          this.selectfields.push({ key: fieldDesc.key, options: fieldDesc.options })
        }
        // seperate dependingselect
        if (fieldDesc.type == 'dependedselect') {
          this.dependedSelectfields.push({ key: fieldDesc.key, dependOnKey: fieldDesc.dependOnKey, options$: fieldDesc.options$ })
          fieldDesc.dependedOptions$ = fieldDesc.options$
          this.dependedKeys.push(fieldDesc.dependOnKey)
        }
        if (fieldDesc.dependOnKey) {
          // console.log('fieldDesc.dependOnKey', fieldDesc)
          this.dependedKeys.push(fieldDesc.dependOnKey)
        }
        if (fieldDesc.rules) {
          this.rules.push({ type: fieldDesc.type, key: fieldDesc.key, rules: fieldDesc.rules})
        }
        // seperate fileupload
        // if (fieldDesc.type == 'fileupload') {
        //   this.upload = fieldDesc.upload
        // }
        let disabled: boolean = fieldDesc.disabled

        // create validators
        let validators: ValidatorFn[] = []
        if (fieldDesc.validators) {
          for (let validator of fieldDesc.validators) {
            switch (true) {
              case validator.email:
                validators = [...validators, Validators.email]
                break
              case typeof validator.max == 'number':
                validators = [...validators, Validators.max(validator.max)]
                break
              case typeof validator.min == 'number':
                validators = [...validators, Validators.min(validator.min)]
                break 
              case validator.maxlength > 0:
                validators = [...validators, Validators.maxLength(validator.maxlength)]
                break
              case validator.minlength > 0:
                validators = [...validators, Validators.minLength(validator.minlength)]
                break
              case validator.required:
                validators = [...validators, Validators.required]
                break
              case validator.validStrongPassword:
                validators = [...validators, CustomValidator.validStrongPassword]
                break
              case validator.zipCodeValidator:
                validators = [...validators, CustomValidator.zipCodeValidator]
                break
              default:
                console.log(this.constructor.name, 'cant find validator', validator)
                break
            }
          }
        }
        return {...mo, [fieldDesc.key]: new FormControl({ value, disabled }, validators)}
      }, {})
    )    

    this._jsonFormService.formData$
    .subscribe({
      next: (data) => {
        if (!data || this.value == data) return
        this.value = data
        this.loading = true
        // patchvalue simple value + flatten
        if (data) this.dynamicForm.patchValue(flatten(data))

        // patchvalue of selected
        if (this.selectfields && data) {
          this.selectfields.forEach(el => {
            el.options.find((kat: Options) => kat.value == data[el.key])
          })
        }

        // patchvalue of dependedselect
        if (this.dependedSelectfields && data) {
          this.dependedSelectfields.forEach(el => {
            el.options$.pipe(
              take(1),
              map((options: any) => {
                // patch options
                let depoptions: any = options.filter((option: any) => option.dep == data[el.dependOnKey])
                let dep: any = this.formContent.find((item: any) => item.key == el.key)
                if (depoptions != undefined) dep.dependedOptions$ = of(depoptions) // todo: FEHLER???
                return options.find((option: any) => {
                  if (option.value == data[el.dependOnKey]) {
                    return option
                  }
                })
              })
            ).subscribe({
              next: (option: any) => {
                // patch value
                if (option) {
                  var obj: any = {}
                  obj[el.key] = option.value
  
                  if (option) this.dynamicForm.patchValue(obj)
                }
              }
            })
          })
        }

        // if (this.dynamicForm.valid) {
          this.formValue.emit(Object.assign({}, this.value, data))
          this.formStatus.emit({ pristine: this.dynamicForm.pristine, dirty: this.dynamicForm.dirty, valid: this.dynamicForm.valid, invalid: this.dynamicForm.invalid, touched: this.dynamicForm.touched, untouched: this.dynamicForm.untouched })
        // }
        this.loading = false
      }
    })

    this._jsonFormService.patchData$.subscribe({
      next: data => {
        this.loading = true
        if (data) this.dynamicForm.patchValue(data)
        this.loading = false
      }
    })

    this.dynamicForm.statusChanges.subscribe({
      next: () => {
        this.formStatus.emit({ pristine: this.dynamicForm.pristine, dirty: this.dynamicForm.dirty, valid: this.dynamicForm.valid, invalid: this.dynamicForm.invalid, touched: this.dynamicForm.touched, untouched: this.dynamicForm.untouched })  
      }
    })

    this.dynamicForm.valueChanges
    .subscribe({
      next: (data) => {

        if (this.loading) return
        // Fehler: Maximum call stack size exceeded in depended input (use simple changes)
        if (!this.loading && this.dynamicForm.valid) {
          this.formValue.emit(Object.assign({}, this.value, data))
        }
        if (this.dependedKeys) {
          this.loading = true
          this.checkDependencies()
          this.loading = false
        }
        if (this.rules) {
          this.loading = true
          this.checkRules()
          this.loading = false
        }
      },
      complete: () => {
        console.log('complete')
      }
    })
  }

  // rules
  checkDependencies() {
    let dependedSet = new Set(this.dependedKeys)
    dependedSet.forEach((el: any) => {
      // depended key value changes
      let item: any = this.formContent.filter((item: any) => item.hasOwnProperty('dependOnKey') && item.dependOnKey == el)
      item.forEach((item: any) => {
        switch (item.type) {
          case 'input':
            // patch value of depended input
            let option: any = item.options.find((option: any) => option.value == this.dynamicForm.controls[el].value)
            if (option) {
              // this.loading = true
              var obj: any = {}
              obj[item.key] = option.label

              this.dynamicForm.patchValue(obj)
              // this.loading = false
            }
            break
          case 'dependedselect':
            // update options on depended select
            item.dependedOptions$ = item.options$.pipe(
              map((options: any) => options.filter((option: any) => option.dep == this.dynamicForm.controls[el].value)),
            )
            break
          default:
            console.log('item.type undefined')
        }
      })
    })
  }

  checkRules() {
    this.rules.forEach((el: any) => {
      if (el.rules) {
        el.rules.forEach((rule: any) => {
          switch (rule.property) {
            /* case 'hidden':
              if (rule.dependOn) {
                let control = this.dynamicForm.controls[rule.dependOn.key]
                if (control.value == rule.dependOn.except) {
                  if (rule.value) {
                    this.dynamicForm.get(el.key)?.disable()
                  } else {
                    this.dynamicForm.get(el.key)?.enable()
                  }
                }
              }
              break */
            // case 'compare':
            //   console.log('value', this.dynamicForm.controls[el.key].value)
            //   if (rule.dependOn.key && !this.checkOperations([this.dynamicForm.controls[el.key].value, this.dynamicForm.controls[rule.dependOn.key].value], rule.dependOn.operation)) {
            //     console.warn('fehler key compare', el)
            //     console.log(this.dynamicForm.controls[el.key])
            //     this.dynamicForm.controls[el.key].setErrors({ 'compare': true })
            //     console.log(this.dynamicForm.controls[el.key])
            //   } else {
            //     this.dynamicForm.controls[el.key].setErrors(null)
            //   }
            //   console.log('value', rule.dependOn.value)
            //   if (rule.dependOn.value && !this.checkOperations([this.dynamicForm.controls[el.key].value, rule.dependOn.value], rule.dependOn.operation)) {
            //     console.warn('fehler value compare', el)
            //     this.dynamicForm.controls[el.key].setErrors({ 'compare': true })
            //   } else {
            //     this.dynamicForm.controls[el.key].setErrors(null)
            //   }
            //   break
            case 'hidden':
              break
            default:
              console.log('rule.property not defined')
          }
        })
      }
    })
  }

  checkOperations(compare: any[], operation: string) {
    console.log('operation', compare, operation)
    switch (operation) {
      case 'eq':
        if (compare[0] == compare[1]) return true
        break
      case 'ne':
        if (compare[0] != compare[1]) return true
        break
      case 'gt':
        if (compare[0] > compare[1]) return true
        break
      case 'lt':
        if (compare[0] < compare[1]) return true
        break
      default:
        console.log('operation not defined')
    }
    return false
  }

  isHiddenRule(control: any): boolean {
    const rule = control.rules?.find((el: any) => el.property == 'hidden')
    if (rule == undefined || rule.dependOn == undefined) return false
    // if (this.checkOperations(rule.dependOn.key, rule.dependOn.operation, rule.dependOn.except)) return rule.value
    switch (rule.dependOn?.operation) {
      case 'eq':
        if (this.dynamicForm.controls[rule.dependOn.key].value == rule.dependOn.except) return rule.value
        break
      case 'ne':
        if (this.dynamicForm.controls[rule.dependOn.key].value != rule.dependOn.except) return rule.value
        break
      default:
        console.log('rule.operation not defined')
    }
    return false
  }

  // input options
  delete(key: string) {
    this.dynamicForm.get(key)?.setValue('')
    this.dynamicForm.get(key)?.markAsDirty()
    this.dynamicForm.get(key)?.markAsTouched()
    this.dynamicForm.get(key)?.updateValueAndValidity()
  }
  setDateTime(key: string) {
    this.dynamicForm.get(key)?.setValue(getLocalISO('now'))
    this.dynamicForm.get(key)?.markAsDirty()
    this.dynamicForm.get(key)?.markAsTouched()
    this.dynamicForm.get(key)?.updateValueAndValidity()
  }
  plus(key: string) {
    this.dynamicForm.get(key)?.setValue(this.dynamicForm.get(key)?.value + 1)
    this.dynamicForm.get(key)?.markAsDirty()
    this.dynamicForm.get(key)?.markAsTouched()
    this.dynamicForm.get(key)?.updateValueAndValidity()
  }
  minus(key: string) {
    this.dynamicForm.get(key)?.setValue(this.dynamicForm.get(key)?.value - 1)
    this.dynamicForm.get(key)?.markAsDirty()
    this.dynamicForm.get(key)?.markAsTouched()
    this.dynamicForm.get(key)?.updateValueAndValidity()
  }
}
