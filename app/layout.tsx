import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Yonder Trade Cost Manager',description:'国际贸易成本与利润测算'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
