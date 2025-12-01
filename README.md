## Beschrijving
Wat is er toegevoegd of aangepast?

## Checklist
- [ ] Code lokaal getest
- [ ] Project werkt nog volledig
- [ ] Commitbericht volgt Conventional Commits
- [ ] Console errors opgelost
- [ ] Branch is up-to-date met dev


## Uitleg voor Git-hub

## [Het joinen van repository]
git clone https://github.com/TrafficDonkey/Jaar-2.git


## [maken van nieuwe branch]
git checkout dev
git pull
git checkout -b JouwBranchNaam

## [Controleren op welke branch je bent]

git branch

## [Kijken of jouw branch geconnect is aan github branch (origin)]

git branch -a  --> kijken naar alle branches
              *JouwBranchNaam
              dev
              main
              origin/dev
              origin/JouwBranchNaam
              origin/main
              zo zien remote branches eruit. Als JouwBranchNaam zowel bovenaan alleen en onder                 met origin staat dan is alles in orde.
              Zo niet krijg je dit te zien
              * JouwBranchNaam
                dev
                main
                remotes/origin/dev
                remotes/origin/main
              Dit fix je met dit command 
              
  git push -u origin JouwBranchNaam

## [Veranderen van branch]

git checkout <branch-name>          <--- branch die je wilt hebben

git branch                          <--- controleren of het goed is gegaan

## [Het versturen van jouw progressie op jouw branch]

git add .                                      < ---- alles aan commit toevoegen
git commit -m o	feature/naam-functionaliteit    < ---- comments over jouw veranderingen
              o	bugfix/naam-issue
              o	task/naam-taak

git push                                        <---- Code pushen ofzowel plaatsen
**Belangrijk** eerste keer moet je git push -u origin JouwBranchNaam doen i.p.v. git push

## [Het maken pull request van JouwBranchNaam naar dev branch]
git checkout JouwBranchNaam
git fetch origin
git merge origin/dev          <---- dit is om te kijken of jouw branch code up to date is met                                        die van dev
                                    Als er problemen zijn los ze eerst op en dan:

git add .
git commit -m  o	feature/naam-functionaliteit
               o	bugfix/naam-issue
               o	task/naam-taak

git push

Op github
Create Pull Request: JouwBranchNaam → dev

## [Code van een andere branch naar jouw zetten]
git checkout JouwBranchNaam
git branch                    <--- controleer of je op jouw branch bent

git fetch origin              <--- haal de nieuwste updates van github binnen

git merge origin/dev          <--- voegd aller nieuwste commits van dev branch




## Reviewer notes
Zijn er dingen om op te letten?