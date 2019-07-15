// Some comments are added to make things clearer

interface Student {
    Name: string,
    Surname: string,
    StudentNumber:number
    Grades:Array<Grades>,
    Teachers:Array<Teachers>,
}

interface Grades {
    Grade: number;
    CourseId: number;
}

interface Teachers {
    Name: string,
    Surname: string
}

//Type Fun and let fun are used to build the pick
    type Fun<a,b> = {
        f : (_:a) => b
        then : <c>(g:Fun<b,c>) => Fun<a,c>
    }

    let fun = <a,b>(f : (_:a) => b) : Fun<a,b> => ({
        f : f,
        then : function<c>(this:Fun<a,b>, g:Fun<b,c>) : Fun<a,c> {
            return then(this, g)
        }
    });

    const then = <a,b,c>(f:Fun<a,b>, g:Fun<b,c>) : Fun<a,c> => fun<a,c>(a => g.f(f.f(a)))

// Pick pakt van T alles in K ; example: Pick<Student, Name> => Dit pakt de naam van de geselecteerde student
    const pick = <T, K extends keyof T>(keys: Array<K>): Fun<T, Pick<T, K>> => (
        fun(object =>
            keys.map(key => key in object ? { [key]: object[key] } : {})
            .reduce((Accumulator, currentValue) => ({ ...Accumulator, ...currentValue }), {}) as Pick<T, K>
        )
    );

// Pakt van een object T, alle bestaande keys; example => pakt alle keys van student => name, surname, studennummer
    const GetAllKeysOffObject = <T>(object: T): Array<keyof T> => Object.keys(object) as Array<keyof T>


/* Omit:
    Dit type wordt gebruikt om bepaalde keys van een object te verwijderen.
    Het returnt het object minus de keys doorgegeven in k.
    > T: Het object waar je de keys van wilt verwijderen.
    > K extends keyof T: De keys die je wilt verwijderen.
    Accumulator = old value
    currentValue = huidige waarde
*/

type omit<T, Conditions extends keyof T> = Pick<T, {
    [K in keyof T]: K extends Conditions ? never : K }[keyof T]>

const omit = <T, K extends keyof T>(keys: Array<keyof T>): Fun<T, omit<T, K>> => (
    fun(object =>
        GetAllKeysOffObject(object).map(key => (keys as Array<keyof T>).includes(key) ? {} : { [key]: object[key] })
        .reduce((Accumulator, currentValue) => ({ ...Accumulator, ...currentValue }), {}) as omit<T, K>
    )
);

// Grabs all the keys of objects that have arrays, such as teachers and grades
    type OnlyArrays<T> = Pick<T, {
        [K in keyof T]: T[K] extends Array<object> ? K : never }[keyof T]>;

// Grabs all the keys of objects that do not have arrays, such as Name, surname and studentnumber
    type ExcludeArrays<T> = Pick<T, {
        [K in keyof T]: T[K] extends Array<object> ? never : K }[keyof T]>;

// Grabs all the keys of the arrays. This makes it easier to acces keys of the arrays
    type PickKeysOffArrays<T, K extends keyof OnlyArrays<T>> = T[K] extends Array<infer A> ? A : never;

// Unit
    type Unit = {}
    let Unit : Unit = {}

// SelectableStudent has a select. This is done to make sure you can start your query only with a select and not with anything else
type SelectableStudent<T, B> = {
        object: Array<T>,
        select: <K extends keyof T>(...entities: Array<K>) => QueryableStudent<omit<T, K>, Pick<T, K>, ExcludeArrays<Pick<T,K>>>
    }

// after you have used the first select. You are able to use another select, include or orderby.
// that's why select returns QueryableStudent which has all the further implementations
type QueryableStudent<T, R, B> = {
        object: Array<T>,
        result: Array<R>,

    select: <K extends keyof T>(...entities: Array<K>) => QueryableStudent<omit<T, K> , R & Pick<T, K>, B & ExcludeArrays<Pick<T,K>>>,

    include: <K extends keyof OnlyArrays<T>, s, r, b>(
        entity: K,
        query: (selectable: SelectableStudent<PickKeysOffArrays<T, K>, B>) => QueryableStudent<s, r, b> | Result<r>
    ) => QueryableStudent<omit<T, K>, R & { [key in K]: Array<r> }, B>,

    orderBy: <H extends keyof B>(type: 'ASCENDING' | 'DESCENDING', entity: H) => Result<R>
}

    type Result<R> = {
        result: Array<R>
    }

// After using the orderby the result gets saved in Result
    let Result = function<R>(result: Array<R>) : Result<R> {
        return {
            result: result
        }
    }

// Implementation of SelectableStudent
    let SelectableStudent = function<T, B>(object: Array<T>) : SelectableStudent<T, B> {
        return {
            object: object,

            select: function<K extends keyof T>(...entities: Array<K>) : QueryableStudent<omit<T, K>, Pick<T, K>, ExcludeArrays<Pick<T,K>>> {
                let res = <any>([]);

                for(let i = 0; i < object.length; i++){
                    // If multiple items inside Grades or Teachers
                    if(Array.isArray(object[i]) && Object.keys(object[i]).length > 1){
                        // subarray is de key => Grades of Teachers - object[i] is Grades of Teachers
                        let subArray: any = object[i] as any
                        res[i] = []
                        // i = Grades or Teachers
                        // g = The items within array of Grades or Teachers
                        for(let g = 0; g < subArray.length; g++){
                            // [g] = index of the keys of Grades or Teachers
                            res[i].push(pick<T,K>(entities).f(subArray[g]))
                        }
                    }
                    else {
                        // If there's no array you add the items to the result
                        // [i] = used for index
                        res[i] = pick<T,K>(entities).f(object[i])
                    }
                }

                // Omit object
                // This part makes sure that the already selected items should not be able to reselect in further selects =>
                // example: select(Name).select(x) => x will have all entities except Name
                const newObject = <any>([])
                object.forEach(element => {
                    newObject.push(omit<T, K>(entities).f(element));
                });

                // Returns Queryable student object with the new object + new result
                return QueryableStudent<omit<T, K>, Pick<T, K>, ExcludeArrays<Pick<T,K>>>(newObject, res);
            }
        }
    }


let QueryableStudent = function<T, R, B>(object: Array<T>, result: Array<R>) : QueryableStudent<T, R, B> {
    return {
        object: object,
        result: result,

        select: function<K extends keyof T>(...entities: Array<K>) : QueryableStudent<omit<T, K>, R & Pick<T, K>, B & ExcludeArrays<Pick<T,K>>> {
            let res = <any>([]);

            for(let i = 0; i < object.length; i++){
                res[i] = {
                    ...(<any>result)[i],
                    ...pick<T,K>(entities).f(object[i])
                }
                // This next part works for the include because it uses arrays
                if((<any>object)[i][0]) {
                    res[i] = []
                    // For all the items in the array -> you will add the items to your result + the old result
                    for(let g = 0; g < Object.keys((<any>object)[i]).length; g++) {
                        // res for the items that are not an array. old result + new result thru a spread
                        res[i][g] = {
                            ...(<any>result)[i][g],
                            ...pick<T,K>(entities).f((<any>object)[i][g])
                        };
                    }
                }
            }

            const newObject = <any>([])
            object.forEach(element => {
                newObject.push(omit<T, K>(entities).f(element));
            });

            // returns new object and the ( old result + new result) ( old B + new B )
            return QueryableStudent<omit<T, K>, R & Pick<T, K>, B & ExcludeArrays<T>>(newObject, res);
        },

        include: function<K extends keyof OnlyArrays<T>, s, r, b>(
            entity: K,
            query: (selectable: SelectableStudent<PickKeysOffArrays<T, K>, B>) => QueryableStudent<s, r, b> | Result<r>
        ) : QueryableStudent<omit<T, K>, R & { [key in K]: Array<r> }, B> {

            // Push the enitity K into an array. This makes sure you can use the omit good
            const entityArray: Array<K> = [];
            entityArray.push(entity);

            // This creates a new object that does not have the entity K
            const newObject = <any>([])
            object.forEach(element => {
                newObject.push(omit<T, K>(entityArray).f(element));
            });

            // Push all the entities you have received into an array
            const allKeysFromEntity = <any>([])
            object.forEach(element => {
                allKeysFromEntity.push((<any>element)[entity]);
            })

            // This turns allKeysFromEntity into an SelectableStudent
            const selectableEntity: SelectableStudent<PickKeysOffArrays<T, K>, B> = SelectableStudent(allKeysFromEntity);

            // Gets result of SelectableStudent, this makes it possible to put them into a new result
            const selectedEntities = query(selectableEntity).result;

            let res = <any>([]);

            // Foreach student you build a new result
            for(let i = 0; i < object.length; i++){
                // Old res + New res
                res[i] = {
                    ...(<any>result)[i],
                    ...{ [entity]:(<any>selectedEntities)[i] } as {[key in K]: Array<r> }
                }
            }
            // Returns a new object and the ( old result + new result ) + ( old B + new B )
            return QueryableStudent<omit<T, K>, R & { [key in K]: Array<r> }, B>(newObject, res);
        },

        orderBy: function<H extends keyof B>(type: 'ASCENDING' | 'DESCENDING', entity: H): Result<R> {
            const resultaat = result as any
            let orderedResult: Array<R> = result;
            
            // If the enitity within your result is an array. Than you can order the enitities
            if(resultaat[0][entity]){
                orderedResult = (<any>result).sort(dynamicSort(entity));
            }
            else {
                // If it is not an array, you go by each index in your result and sort them
                // <any>element can be the Name, surname and studentnumber, etc etc
                for (let index = 0; index < resultaat.length; index++) {
                    const element = resultaat[index];
                    (<any>element).sort(dynamicSort(entity))
                }
            }

            function dynamicSort(property: any) {
                var sortOrder = type === 'ASCENDING' ? 1 : -1;
                // fst = the first item in Grades or Teachers,
                // snd = the second item in Grades or Teachers,
                // fst & snd are compared
                return function (fst: any, snd: any) {
                    if(fst[property] === String) {
                        // First letter is turned into uppercase, the remaining string gets glued back together by slice.
                        const uppercaseFirst = fst[property].charAt(0).toUpperCase() + fst[property].slice(1);
                        const uppercaseSecond = snd[property].charAt(0).toUpperCase() + snd[property].slice(1);
                        // sorts the 2 strings
                        var res = (uppercaseFirst < uppercaseSecond) ? -1 : (uppercaseFirst > uppercaseSecond) ? 1 : 0;
                        return res * sortOrder;
                    }
                    else {
                        // This is used for non strings, such as floats or numbers
                        var res = (fst[property] < snd[property]) ? -1 : (fst[property] > snd[property]) ? 1 : 0;
                        return res * sortOrder;
                    }
                }
            }
            return Result(orderedResult)
        }
    }
}

let student: Student = ({
    Name: 'Ali',
    StudentNumber: 7,
    Surname: 'Musharuf',
    Grades: [{
        Grade: 9,
        CourseId: 1
    },
    {
        Grade: 7,
        CourseId: 4
    }
    ],
    Teachers:[{
        Name: 'Jan',
        Surname: 'Jansen'
    },
    {
        Name: 'Piet',
        Surname: 'Velden'
    }
    ]
});

let student_two: Student = ({
    Name: 'Freek',
    StudentNumber: 4,
    Surname: 'Zonneveld',
    Grades: [{
        Grade: 6,
        CourseId: 5,
    },
    {
        Grade: 8,
        CourseId: 6,
    }],
    Teachers:[{
        Name: 'Tina',
        Surname: 'Turner'
    },
    {
        Name: 'Stevie',
        Surname: 'Wonder'
    }]
});

let student_three: Student = ({
    Name: 'Molly',
    StudentNumber: 6,
    Surname: 'Dijkzigt',
    Grades: [{
        Grade: 4,
        CourseId: 9,
    },
    {
        Grade: 5,
        CourseId: 3,
    }],
    Teachers:[{
        Name: 'Antonio',
        Surname: 'Letterman'
    },
    {
        Name: 'Britney',
        Surname: 'Spears'
    }]
});

let student_four: Student = ({
    Name: 'Delany',
    StudentNumber: 1,
    Surname: 'Grootzicht',
    Grades: [{
        Grade: 3.5,
        CourseId: 12,
    },
    {
        Grade: 3,
        CourseId: 7,
    }],
    Teachers:[{
        Name: 'Angelo',
        Surname: 'Tielemans'
    },
    {
        Name: 'Marieke',
        Surname: 'Kijkers'
    }]
});

let AllStudents = [student, student_two, student_three, student_four];
let QueryableStudents = SelectableStudent<Student, Student>(AllStudents);

// JSON stringify is used to pretty print the result

let query = JSON.stringify(QueryableStudents
                .select('StudentNumber')
                .select('Name', 'Surname')
                .include('Grades', q => q.select('Grade', 'CourseId'))
                .include('Teachers', t => t.select('Name').orderBy('ASCENDING', 'Name'))
                .orderBy('ASCENDING', 'StudentNumber').result, null, 4);

console.log('query', query);
